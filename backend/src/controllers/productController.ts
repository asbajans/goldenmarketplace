/**
 * Product Controller
 * Handle product operations with gold-gram pricing
 */

import { Request, Response } from 'express';
import { Op, Sequelize } from 'sequelize';
import { Product, ProductVariant, Store, User, SubscriptionPlan } from '../models';
import goldPriceService from '../services/goldPriceService';
import { s3Service } from '../services/s3Service';
import { productSyncQueue } from '../jobs/productSyncJob';

export class ProductController {
  /**
   * Get all products
   */
  static async getProducts(req: Request, res: Response) {
    try {
      const { storeId, category, page = 1, limit = 25, search, marketplaces } = req.query;

      const where: any = { isActive: true };

      const user = (req as any).user;
      
      if (storeId) {
        where.storeId = storeId;
      } else if (user && user.role !== 'admin') {
        const store = await Store.findOne({ where: { userId: user.id } });
        if (store) where.storeId = store.id;
        else return res.status(403).json({ error: { message: 'Shop not found' } });
      }
      if (category) where.category = category;
      if (search) {
        where.title = { [Op.iLike]: `%${search}%` };
      }
      // Filter by marketplaces - only apply filter if marketplaces array is provided and not empty
      if (marketplaces) {
        // Parse marketplace parameter - could be array or comma-separated string
        let marketplaceArray: string[] = [];
        if (Array.isArray(marketplaces)) {
          marketplaceArray = marketplaces as string[];
        } else if (typeof marketplaces === 'string') {
          marketplaceArray = (marketplaces as string).split(',').map(m => m.trim());
        }
        
        if (marketplaceArray.length > 0) {
          // Normalize marketplace values - convert to lowercase
          const normalizedMarketplaces = marketplaceArray.map(m => 
            m === 'goldenmarketplace' ? 'golden' : m.toLowerCase()
          );
          
          // Use JSON string matching approach - check JSON text representation contains each marketplace
          // Build conditions for each marketplace
          const conditions = normalizedMarketplaces.map((m: string) => 
            `LOWER("marketplaces"::text) LIKE '%${m}%'`
          ).join(' OR ');
          
          where[Op.and] = Sequelize.literal(`(${conditions})`);
        }
      }

      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

      const { count, rows } = await Product.findAndCountAll({
        where,
        include: [{ model: ProductVariant, as: 'variants' }],
        limit: parseInt(limit as string),
        offset,
        order: [['createdAt', 'DESC']]
      });

      return res.status(200).json({
        data: rows,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: count,
          pages: Math.ceil(count / parseInt(limit as string))
        }
      });
    } catch (error) {
      console.error('Get products error:', error);
      return res.status(500).json({
        error: { message: 'Internal server error', status: 500 }
      });
    }
  }

  /**
   * Create product
   */
  static async createProduct(req: Request, res: Response) {
    try {
      const {
        title, description, category, categoryId, sku, quantity,
        images, videoUrl, marketplaces, marketplaceConfig, gramWeight, milyem, effectiveMilyem, profitMargin, priceMultiplier,
        isB2BEnabled, b2bDiscount, discountRate,
        hasVariants, variantAttributes, variants,
        translations, defaultLanguage = 'en'
      } = req.body;

      // Validate required gold fields
      if (!gramWeight || gramWeight <= 0) {
        return res.status(400).json({
          error: { message: 'Gram ağırlığı zorunludur ve 0\'dan büyük olmalıdır.', status: 400 }
        });
      }
      if (!milyem || milyem <= 0 || milyem > 1000) {
        return res.status(400).json({
          error: { message: 'Geçerli bir milyem değeri giriniz (1-1000).', status: 400 }
        });
      }

      // effectiveMilyem must be >= milyem if provided
      const finalEffectiveMilyem = effectiveMilyem && effectiveMilyem >= milyem ? effectiveMilyem : milyem;
      const gramHas = Math.round(gramWeight * (finalEffectiveMilyem / 1000) * 10000) / 10000;

      // Find store for current user
      const store = await Store.findOne({ where: { userId: (req as any).user.id } });
      if (!store) {
        console.error('CreateProduct Error: Store not found for user', (req as any).user.id);
        return res.status(400).json({
          error: { message: 'You do not have a store created yet.', status: 400 }
        });
      }

      // Subscription plan limit enforcement
      const user = await User.findByPk((req as any).user.id);
      const FREE_TIER_LIMIT = 5;
      if (user) {
        let productLimit = FREE_TIER_LIMIT;
        if (user.subscriptionPlan) {
          const plan = await SubscriptionPlan.findOne({ where: { name: user.subscriptionPlan, isActive: true } });
          if (plan) productLimit = plan.productLimit;
        }
        const existingCount = await Product.count({ where: { storeId: store.id } });
        if (existingCount >= productLimit) {
          return res.status(403).json({
            error: {
              message: `Paket limitinize ulaştınız. Mevcut paketiniz maksimum ${productLimit} ürün izni vermektedir. Lütfen pakedinizi yükseltin.`,
              status: 403,
              productLimit,
              currentCount: existingCount
            }
          });
        }
      }

      // Calculate prices from gram + effectiveMilyem + profit margin + price multiplier
      const finalPriceMultiplier = priceMultiplier || 1;
      const { priceTRY, priceUSD } = await goldPriceService.calculateProductPrice(gramWeight, finalEffectiveMilyem, profitMargin || 0, finalPriceMultiplier);

      // Handle B2B fields
      const finalB2bDiscount = isB2BEnabled ? (b2bDiscount || 0) : 0;
      const b2bPrice = Math.round(priceTRY * (1 - finalB2bDiscount / 100) * 100) / 100;

      // Handle Golden Marketplace discount
      const finalDiscountRate = discountRate || 0;
      const discountedPrice = finalDiscountRate > 0 ? Math.round(priceTRY * (1 - finalDiscountRate / 100) * 100) / 100 : 0;

      const tags = ProductController.generateTags(title, category);

      const product = await Product.create({
        storeId: store.id,
        title,
        slug: title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        description,
        category,
        categoryId: categoryId || null,
        // @ts-ignore - translations field added via migration
        translations: translations || {},
        // @ts-ignore - defaultLanguage field added via migration
        defaultLanguage: defaultLanguage || 'en',
        sku,
        gramWeight,
        milyem,
        effectiveMilyem: finalEffectiveMilyem,
        gramHas,
        profitMargin: profitMargin || 0,
        priceMultiplier: finalPriceMultiplier,
        priceTRY,
        priceUSD,
        isB2BEnabled: !!isB2BEnabled,
        b2bDiscount: finalB2bDiscount,
        b2bPrice,
        discountRate: finalDiscountRate,
        discountedPrice,
        quantity: quantity || 0,
        images: Array.isArray(images) ? await Promise.all(images.map((img: string) => s3Service.uploadBase64Image(img, `products/${store.storeSlug}`))) : [],
        videoUrl,
        marketplaces: (Array.isArray(marketplaces) && marketplaces.length > 0) ? marketplaces : ['golden'],
        marketplaceConfig: marketplaceConfig || {},
        hasVariants: !!hasVariants,
        variantAttributes: variantAttributes || [],
        tags,
        isActive: true
      });

      // Handle variants creation
      let createdVariants: any[] = [];
      if (hasVariants && Array.isArray(variants) && variants.length > 0) {
        const variantRecords = await Promise.all(variants.map(async (v: any) => {
           const vFinalEffectiveMilyem = v.effectiveMilyem && v.effectiveMilyem >= milyem ? v.effectiveMilyem : milyem;
           const vPriceData = await goldPriceService.calculateProductPrice(v.gramWeight || gramWeight, vFinalEffectiveMilyem, profitMargin || 0);
           const vB2BPrice = isB2BEnabled ? Math.round(vPriceData.priceTRY * (1 - finalB2bDiscount / 100) * 100) / 100 : 0;
           return {
               productId: product.id,
               sku: v.sku || `${sku}-${Math.floor(Math.random() * 10000)}`,
               attributes: v.attributes || {},
               gramWeight: v.gramWeight || gramWeight,
               quantity: v.quantity || 0,
               priceTRY: vPriceData.priceTRY,
               priceUSD: vPriceData.priceUSD,
               b2bPrice: vB2BPrice,
               isActive: true
           };
        }));
        createdVariants = await ProductVariant.bulkCreate(variantRecords);
        
        // Update product total quantity based on variants
        const totalQuantity = createdVariants.reduce((sum, v) => sum + v.quantity, 0);
        await product.update({ quantity: totalQuantity });
      }

      // Trigger marketplace sync (non-blocking - don't fail product creation if queue is down)
      try {
        // @ts-ignore
        productSyncQueue.add({
          productId: product.id,
          userId: (req as any).user.id,
          trigger: 'create'
        });
      } catch (queueErr) {
        console.warn('[ProductController] Could not enqueue sync job (Redis down?):', queueErr);
      }

      return res.status(201).json({
        message: 'Product created successfully',
        product
      });
    } catch (error: any) {
      console.error('Create product error:', error);

      // Unique constraint violation (duplicate SKU or slug)
      if (error.name === 'SequelizeUniqueConstraintError' || error.original?.code === '23505') {
        const field = error.fields ? Object.keys(error.fields)[0] : 'alan';
        const fieldLabel = field === 'sku' ? 'SKU (Stok Kodu)' : field;
        return res.status(400).json({
          error: { message: `Bu ${fieldLabel} zaten kullanımda. Lütfen benzersiz bir değer giriniz.`, status: 400 }
        });
      }

      return res.status(500).json({
        error: { message: 'Internal server error', status: 500 }
      });
    }
  }

  /**
   * Update product
   */
  static async updateProduct(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const {
        title, description, category, categoryId, quantity,
        images, videoUrl, marketplaces, marketplaceConfig, gramWeight, milyem, effectiveMilyem, profitMargin, priceMultiplier,
        isB2BEnabled, b2bDiscount, discountRate,
        hasVariants, variantAttributes, variants
      } = req.body;

      const user = (req as any).user;
      const product = await Product.findByPk(id);
      if (!product) {
        return res.status(404).json({
          error: { message: 'Product not found', status: 404 }
        });
      }

      if (user.role !== 'admin') {
        const store = await Store.findOne({ where: { userId: user.id } });
        if (!store || store.id !== product.storeId) {
          return res.status(403).json({ error: { message: 'Unauthorized: You can only edit your own products', status: 403 } });
        }
      }

      const isCloned = !!product.originalStoreName;

      let finalQuantity = product.quantity;
      if (isCloned) {
        finalQuantity = product.quantity; // Lock clone quantity
      } else if (quantity !== undefined) {
        finalQuantity = quantity;
        if (finalQuantity !== product.quantity) {
           await Product.update({ quantity: finalQuantity }, { where: { originalProductId: id } });
        }
      }

      let finalPriceTRY, finalPriceUSD, finalB2bPrice;
      const finalProfitMargin = profitMargin !== undefined ? profitMargin : product.profitMargin;
      const finalPriceMultiplier = priceMultiplier !== undefined ? priceMultiplier : product.priceMultiplier;
      const finalGramWeight = isCloned ? product.gramWeight : (gramWeight || product.gramWeight);
      const finalMilyem = isCloned ? product.milyem : (milyem || product.milyem);
      const rawEffective = isCloned ? product.effectiveMilyem : (effectiveMilyem || product.effectiveMilyem);
      const finalEffectiveMilyem = rawEffective && rawEffective >= finalMilyem ? rawEffective : finalMilyem;
      const finalGramHas = Math.round(finalGramWeight * (finalEffectiveMilyem / 1000) * 10000) / 10000;
      
      if (isCloned && product.originalProductId) {
         const parent = await Product.findByPk(product.originalProductId);
         if (parent && parent.b2bPrice > 0) {
            finalPriceTRY = Math.round(parent.b2bPrice * (1 + finalProfitMargin / 100) * 100) / 100;
         } else if (parent && parent.priceTRY > 0) {
            finalPriceTRY = Math.round(parent.priceTRY * (1 + finalProfitMargin / 100) * 100) / 100;
         } else {
            const { priceTRY } = await goldPriceService.calculateProductPrice(
              Number(finalGramWeight), Number(finalMilyem), Number(finalProfitMargin)
            );
            finalPriceTRY = priceTRY;
         }
         const currentGold = await goldPriceService.getCurrentGoldPrice();
         finalPriceUSD = Math.round((finalPriceTRY / currentGold.usdTryRate) * 100) / 100;
         finalB2bPrice = 0;
       } else {
        const calcRes = await goldPriceService.calculateProductPrice(
          Number(finalGramWeight), Number(finalEffectiveMilyem), Number(finalProfitMargin), Number(finalPriceMultiplier)
        );
        finalPriceTRY = calcRes.priceTRY;
        finalPriceUSD = calcRes.priceUSD;
        
        const finalIsB2BEnabled = isB2BEnabled !== undefined ? !!isB2BEnabled : product.isB2BEnabled;
        const finalB2bDiscount = b2bDiscount !== undefined ? b2bDiscount : product.b2bDiscount;
        finalB2bPrice = Math.round(finalPriceTRY * (1 - (finalIsB2BEnabled ? finalB2bDiscount : 0) / 100) * 100) / 100;
      }

      const tags = ProductController.generateTags(
        isCloned ? product.title : (title || product.title),
        isCloned ? product.category : (category || product.category)
      );

      const finalIsB2BEnabled = isCloned ? false : (isB2BEnabled !== undefined ? !!isB2BEnabled : product.isB2BEnabled);
      const finalB2bDiscount = isCloned ? 0 : (b2bDiscount !== undefined ? b2bDiscount : product.b2bDiscount);
      const finalDiscountRate = isCloned ? 0 : (discountRate !== undefined ? discountRate : product.discountRate);
      const finalDiscountedPrice = finalDiscountRate > 0 ? Math.round(finalPriceTRY * (1 - finalDiscountRate / 100) * 100) / 100 : 0;
      const finalHasVariants = isCloned ? false : (hasVariants !== undefined ? !!hasVariants : product.hasVariants);
      const finalVariantAttributes = isCloned ? [] : (variantAttributes || product.variantAttributes);

      await product.update({
        title: isCloned ? product.title : (title || product.title),
        description: isCloned ? product.description : (description || product.description),
        category: isCloned ? product.category : (category || product.category),
        categoryId: isCloned ? product.categoryId : (categoryId !== undefined ? categoryId : product.categoryId),
        gramWeight: finalGramWeight,
        milyem: finalMilyem,
        effectiveMilyem: finalEffectiveMilyem,
        gramHas: finalGramHas,
        profitMargin: finalProfitMargin,
        priceMultiplier: finalPriceMultiplier,
        priceTRY: finalPriceTRY,
        priceUSD: finalPriceUSD,
        isB2BEnabled: finalIsB2BEnabled,
        b2bDiscount: finalB2bDiscount,
        b2bPrice: finalB2bPrice,
        discountRate: finalDiscountRate,
        discountedPrice: finalDiscountedPrice,
        quantity: finalQuantity,
        images: isCloned ? product.images : (Array.isArray(images) ? await Promise.all(images.map((img: string) => s3Service.uploadBase64Image(img, `products/${product.storeId}`))) : product.images),
        videoUrl: isCloned ? product.videoUrl : (videoUrl !== undefined ? videoUrl : product.videoUrl),
        marketplaces: marketplaces || product.marketplaces,
        marketplaceConfig: marketplaceConfig !== undefined ? marketplaceConfig : product.marketplaceConfig,
        hasVariants: finalHasVariants,
        variantAttributes: finalVariantAttributes,
        tags: isCloned ? product.tags : tags
      });

      // Handle variants update
      if (finalHasVariants && Array.isArray(variants)) {
        await ProductVariant.destroy({ where: { productId: id } });
        if (variants.length > 0) {
            const variantRecords = await Promise.all(variants.map(async (v: any) => {
               const vFinalEffectiveMilyem = v.effectiveMilyem && v.effectiveMilyem >= finalMilyem ? v.effectiveMilyem : finalMilyem;
               const vPriceData = await goldPriceService.calculateProductPrice(v.gramWeight || finalGramWeight, vFinalEffectiveMilyem, finalProfitMargin);
               const vB2BPrice = finalIsB2BEnabled ? Math.round(vPriceData.priceTRY * (1 - finalB2bDiscount / 100) * 100) / 100 : 0;
               return {
                   productId: product.id,
                   sku: v.sku || `${product.sku}-${Math.floor(Math.random() * 10000)}`,
                   attributes: v.attributes || {},
                   gramWeight: v.gramWeight || finalGramWeight,
                   quantity: v.quantity || 0,
                   priceTRY: vPriceData.priceTRY,
                   priceUSD: vPriceData.priceUSD,
                   b2bPrice: vB2BPrice,
                   isActive: true
               };
            }));
            const createdVariants = await ProductVariant.bulkCreate(variantRecords);
            
            // Update total quantity
            finalQuantity = createdVariants.reduce((sum, v) => sum + v.quantity, 0);
            await product.update({ quantity: finalQuantity });
        }
      } else if (!finalHasVariants && product.hasVariants) {
        // User turned off variants
        await ProductVariant.destroy({ where: { productId: id } });
      }

      // Trigger marketplace sync (non-blocking)
      try {
        // @ts-ignore
        productSyncQueue.add({
          productId: product.id,
          userId: (req as any).user.id,
          trigger: 'update'
        });
      } catch (queueErr) {
        console.warn('[ProductController] Could not enqueue sync job (Redis down?):', queueErr);
      }

      return res.status(200).json({
        message: 'Product updated successfully',
        product
      });
    } catch (error) {
      console.error('Update product error:', error);
      return res.status(500).json({
        error: { message: 'Internal server error', status: 500 }
      });
    }
  }

  /**
   * Delete product
   */
  static async deleteProduct(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const user = (req as any).user;
      const product = await Product.findByPk(id);
      if (!product) {
        return res.status(404).json({
          error: { message: 'Product not found', status: 404 }
        });
      }

      if (user.role !== 'admin') {
        const store = await Store.findOne({ where: { userId: user.id } });
        if (!store || store.id !== product.storeId) {
          return res.status(403).json({ error: { message: 'Unauthorized: You can only delete your own products', status: 403 } });
        }
      }

      await product.destroy();

      return res.status(200).json({
        message: 'Product deleted successfully'
      });
    } catch (error) {
      console.error('Delete product error:', error);
      return res.status(500).json({
        error: { message: 'Internal server error', status: 500 }
      });
    }
  }

  /**
   * Calculate gold price preview (for frontend live display)
   */
  static async calculateGoldPrice(req: Request, res: Response) {
    try {
      const { gramWeight, milyem, profitMargin, priceMultiplier } = req.body;

      if (!gramWeight || gramWeight <= 0 || !milyem) {
        return res.status(400).json({
          error: { message: 'gramWeight and milyem are required', status: 400 }
        });
      }

      const gold = await goldPriceService.getCurrentGoldPrice();
      const { priceTRY, priceUSD } = await goldPriceService.calculateProductPrice(gramWeight, milyem, profitMargin || 0, priceMultiplier || 1);

      return res.status(200).json({
        gramWeight,
        milyem,
        profitMargin: profitMargin || 0,
        priceMultiplier: priceMultiplier || 1,
        gold24KGramTRY: gold.pricePerGramTRY,
        priceTRY,
        priceUSD
      });
    } catch (error) {
      console.error('Calculate gold price error:', error);
      return res.status(500).json({
        error: { message: 'Failed to calculate gold price', status: 500 }
      });
    }
  }

  /**
   * Get store auto price sync setting
   */
  static async getAutoPriceSyncStatus(req: Request, res: Response) {
      try {
          const user = (req as any).user;
          let store;
          
          if (user.role === 'admin' && req.query.storeId) {
             store = await Store.findByPk(req.query.storeId as string);
          } else {
             store = await Store.findOne({ where: { userId: user.id } });
          }
          
          if (!store) return res.status(404).json({ error: 'Store not found' });
          
          return res.status(200).json({ autoPriceSync: store.autoPriceSync });
      } catch (error) {
          console.error('Get auto price sync error:', error);
          return res.status(500).json({ error: 'Internal error' });
      }
  }

  /**
   * Set store auto price sync setting
   */
  static async setAutoPriceSyncStatus(req: Request, res: Response) {
      try {
          const user = (req as any).user;
          const { autoPriceSync } = req.body;
          
          let store = await Store.findOne({ where: { userId: user.id } });
          if (!store) return res.status(404).json({ error: 'Store not found' });
          
          await store.update({ autoPriceSync: !!autoPriceSync });
          
          return res.status(200).json({ success: true, autoPriceSync: store.autoPriceSync });
      } catch (error) {
          console.error('Set auto price sync error:', error);
          return res.status(500).json({ error: 'Internal error' });
      }
  }

  /**
   * Manual price sync for the store
   */
  static async syncStorePrices(req: Request, res: Response) {
      try {
          const user = (req as any).user;
          const store = await Store.findOne({ where: { userId: user.id } });
          
          if (!store) return res.status(404).json({ error: 'Store not found' });
          
          const gold = await goldPriceService.getCurrentGoldPrice();
          if (!gold || !gold.pricePerGramTRY) {
              return res.status(400).json({ error: 'Gücel altın fiyatı bulunamadı.' });
          }

          const products = await Product.findAll({ where: { storeId: store.id, isActive: true } });
          let updatedCount = 0;

          // First sync non-clones
          const nonClones = products.filter(p => !p.originalProductId);
          for (const product of nonClones) {
             const usedMilyem = Number(product.effectiveMilyem || product.milyem);
             const { priceTRY } = goldPriceService.calculatePrice(
                  Number(product.gramWeight),
                  usedMilyem,
                  Number(product.profitMargin || 0),
                  gold.pricePerGramTRY,
                  Number(product.priceMultiplier || 1)
              );
              const gramHas = Math.round(Number(product.gramWeight) * (usedMilyem / 1000) * 10000) / 10000;
             const b2bPrice = product.isB2BEnabled ? Math.round(priceTRY * (1 - (product.b2bDiscount || 0) / 100) * 100) / 100 : 0;
             const priceUSD = Math.round((priceTRY / gold.usdTryRate) * 100) / 100;
             await product.update({ priceTRY, b2bPrice, priceUSD, gramHas });
             updatedCount++;
          }

          // Sync Variants for non-clones
          const nonCloneVariantIds = nonClones.map(p => p.id);
          if (nonCloneVariantIds.length > 0) {
              const variants = await ProductVariant.findAll({
                  where: { productId: { [Op.in]: nonCloneVariantIds } }
              });
              
              for (const variant of variants) {
                  const prod = nonClones.find(p => p.id === variant.productId);
                  if (!prod) continue;

                  const usedMilyem = Number(prod.effectiveMilyem || prod.milyem);
                  const { priceTRY } = goldPriceService.calculatePrice(
                      Number(variant.gramWeight || prod.gramWeight),
                      usedMilyem,
                      Number(prod.profitMargin || 0),
                      gold.pricePerGramTRY
                  );
                  const priceUSD = Math.round((priceTRY / gold.usdTryRate) * 100) / 100;
                  const b2bPrice = prod.isB2BEnabled ? Math.round(priceTRY * (1 - (prod.b2bDiscount || 0) / 100) * 100) / 100 : 0;
                  await variant.update({ priceTRY, priceUSD, b2bPrice });
              }
          }

          const clones = products.filter(p => !!p.originalProductId);
          // Load parents for clones
          for (const clone of clones) {
             const parent = await Product.findByPk(clone.originalProductId);
             if (parent && parent.b2bPrice > 0) {
                const priceTRY = Math.round(parent.b2bPrice * (1 + (clone.profitMargin || 0) / 100) * 100) / 100;
                const priceUSD = Math.round((priceTRY / gold.usdTryRate) * 100) / 100;
                await clone.update({ priceTRY, priceUSD });
                updatedCount++;
             } else if (parent && parent.priceTRY > 0) {
                const priceTRY = Math.round(parent.priceTRY * (1 + (clone.profitMargin || 0) / 100) * 100) / 100;
                const priceUSD = Math.round((priceTRY / gold.usdTryRate) * 100) / 100;
                await clone.update({ priceTRY, priceUSD });
                updatedCount++;
             }
          }
          
          // Sync Variants for clones
          const cloneVariantIds = clones.map(p => p.id);
          if (cloneVariantIds.length > 0) {
             const variants = await ProductVariant.findAll({
                  where: { productId: { [Op.in]: cloneVariantIds } }
             });
             for (const variant of variants) {
                  const clone = clones.find(p => p.id === variant.productId);
                  if (!clone) continue;

                  const parent = await Product.findByPk(clone.originalProductId);
                  if (!parent) continue;

                  let clonedVariant = await ProductVariant.findOne({ where: { productId: parent.id, sku: variant.sku } });
                  // Try matching by attributes if sku doesn't match perfectly
                  if (!clonedVariant) {
                      const allParentVariants = await ProductVariant.findAll({ where: { productId: parent.id } });
                      clonedVariant = allParentVariants.find(v => JSON.stringify(v.attributes) === JSON.stringify(variant.attributes)) || null;
                  }

                  if (clonedVariant) {
                       const priceTRY = Math.round(clonedVariant.priceTRY * (1 + (clone.profitMargin || 0) / 100) * 100) / 100;
                       const priceUSD = Math.round((priceTRY / gold.usdTryRate) * 100) / 100;
                       await variant.update({ priceTRY, priceUSD });
                  } else {
                       const priceTRY = Math.round(parent.priceTRY * (1 + (clone.profitMargin || 0) / 100) * 100) / 100;
                       const priceUSD = Math.round((priceTRY / gold.usdTryRate) * 100) / 100;
                       await variant.update({ priceTRY, priceUSD });
                  }
             }
          }

          // Trigger marketplace sync in background
          try {
            const marketplacePriceSyncService = require('../services/marketplacePriceSyncService').default;
            marketplacePriceSyncService.syncUser(user.id);
          } catch (err) {
            console.error('[ProductController] Could not trigger marketplace sync:', err);
          }

          return res.status(200).json({ 
             success: true, 
             message: 'Fiyatlar güncel altın kuruna göre başarıyla senkronize edildi.',
             updatedCount 
          });
      } catch (error) {
          console.error('Sync store prices error:', error);
          return res.status(500).json({ error: 'Manual sync failed' });
      }
  }

  /**
   * Generate tags from title and category
   */
  private static generateTags(title: string, category: string): string[] {
    const combined = `${title} ${category}`.toLowerCase();
    const words = combined.split(/[\s,.-]+/).filter(w => w.length > 2);
    return Array.from(new Set(words));
  }
}

export default ProductController;
