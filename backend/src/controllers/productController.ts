/**
 * Product Controller
 * Handle product operations with gold-gram pricing
 */

import { Request, Response } from 'express';
import { Op } from 'sequelize';
import Product from '../models/Product';
import Store from '../models/Store';
import goldPriceService from '../services/goldPriceService';
import { productSyncQueue } from '../jobs/productSyncJob';

export class ProductController {
  /**
   * Get all products
   */
  static async getProducts(req: Request, res: Response) {
    try {
      const { storeId, category, page = 1, limit = 20, search } = req.query;

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
        where.title = { [Op.substring]: String(search) };
      }

      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

      const { count, rows } = await Product.findAndCountAll({
        where,
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
        title, description, category, sku, quantity,
        images, videoUrl, marketplaces, gramWeight, milyem, profitMargin,
        isB2BEnabled, b2bDiscount
      } = req.body;

      // Validate required gold fields
      if (!gramWeight || gramWeight <= 0) {
        return res.status(400).json({
          error: { message: 'Gram ağırlığı zorunludur ve 0\'dan büyük olmalıdır.', status: 400 }
        });
      }
      if (!milyem || ![333, 585, 750, 916, 999].includes(milyem)) {
        return res.status(400).json({
          error: { message: 'Geçerli bir milyem değeri giriniz (333, 585, 750, 916, 999).', status: 400 }
        });
      }

      // Find store for current user
      const store = await Store.findOne({ where: { userId: (req as any).user.id } });
      if (!store) {
        console.error('CreateProduct Error: Store not found for user', (req as any).user.id);
        return res.status(400).json({
          error: { message: 'You do not have a store created yet.', status: 400 }
        });
      }

      // Calculate prices from gram + milyem + profit margin
      const { priceTRY, priceUSD } = await goldPriceService.calculateProductPrice(gramWeight, milyem, profitMargin || 0);

      // Handle B2B fields
      const finalB2bDiscount = isB2BEnabled ? (b2bDiscount || 0) : 0;
      const b2bPrice = Math.round(priceTRY * (1 - finalB2bDiscount / 100) * 100) / 100;

      const tags = ProductController.generateTags(title, category);

      const product = await Product.create({
        storeId: store.id,
        title,
        slug: title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        description,
        category,
        sku,
        gramWeight,
        milyem,
        profitMargin: profitMargin || 0,
        priceTRY,
        priceUSD,
        isB2BEnabled: !!isB2BEnabled,
        b2bDiscount: finalB2bDiscount,
        b2bPrice,
        quantity: quantity || 0,
        images: Array.isArray(images) ? images : [],
        videoUrl,
        marketplaces: (Array.isArray(marketplaces) && marketplaces.length > 0) ? marketplaces : ['golden'],
        tags,
        isActive: true
      });

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
        title, description, category, quantity,
        images, videoUrl, marketplaces, gramWeight, milyem, profitMargin,
        isB2BEnabled, b2bDiscount
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

      // Recalculate prices if gram/milyem changed
      const finalGramWeight = gramWeight || product.gramWeight;
      const finalMilyem = milyem || product.milyem;
      const finalProfitMargin = profitMargin !== undefined ? profitMargin : product.profitMargin;
      const { priceTRY, priceUSD } = await goldPriceService.calculateProductPrice(
        Number(finalGramWeight), Number(finalMilyem), Number(finalProfitMargin)
      );

      const tags = ProductController.generateTags(
        title || product.title,
        category || product.category
      );

      const finalIsB2BEnabled = isB2BEnabled !== undefined ? !!isB2BEnabled : product.isB2BEnabled;
      const finalB2bDiscount = b2bDiscount !== undefined ? b2bDiscount : product.b2bDiscount;
      const finalB2bPrice = Math.round(priceTRY * (1 - (finalIsB2BEnabled ? finalB2bDiscount : 0) / 100) * 100) / 100;

      await product.update({
        title: title || product.title,
        description: description || product.description,
        category: category || product.category,
        gramWeight: finalGramWeight,
        milyem: finalMilyem,
        profitMargin: finalProfitMargin,
        priceTRY,
        priceUSD,
        isB2BEnabled: finalIsB2BEnabled,
        b2bDiscount: finalIsB2BEnabled ? finalB2bDiscount : 0,
        b2bPrice: finalB2bPrice,
        quantity: quantity !== undefined ? quantity : product.quantity,
        images: images || product.images,
        videoUrl: videoUrl !== undefined ? videoUrl : product.videoUrl,
        marketplaces: marketplaces || product.marketplaces,
        tags
      });

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
      const { gramWeight, milyem, profitMargin } = req.body;

      if (!gramWeight || gramWeight <= 0 || !milyem) {
        return res.status(400).json({
          error: { message: 'gramWeight and milyem are required', status: 400 }
        });
      }

      const gold = await goldPriceService.getCurrentGoldPrice();
      const { priceTRY, priceUSD } = await goldPriceService.calculateProductPrice(gramWeight, milyem, profitMargin || 0);

      return res.status(200).json({
        gramWeight,
        milyem,
        profitMargin: profitMargin || 0,
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
   * Generate tags from title and category
   */
  private static generateTags(title: string, category: string): string[] {
    const combined = `${title} ${category}`.toLowerCase();
    const words = combined.split(/[\s,.-]+/).filter(w => w.length > 2);
    return Array.from(new Set(words));
  }
}

export default ProductController;
