/**
 * B2B Controller
 * Handles B2B product discovery and store-to-store listing request workflow.
 */

import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Product, ProductVariant, B2BRequest, Store } from '../models';
import goldPriceService from '../services/goldPriceService';


export class B2BController {
  /**
   * GET /b2b/products
   * Returns paginated B2B-enabled products (seller & admin only).
   * Optimized: limited attributes, pagination, no description/tags in list view.
   */
  static async getB2BProducts(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 24;
      const offset = (page - 1) * limit;
      const search = req.query.search as string;
      const category = req.query.category as string;
      const filterStoreId = req.query.storeId as string;

      // Use pre-cached store from sellerMiddleware (no extra DB call)
      const myStore = (req as any).store;
      const myStoreId = myStore?.id || null;

      const where: any = { isB2BEnabled: true, isActive: true };
      if (category) where.category = category;
      if (filterStoreId) where.storeId = filterStoreId;
      if (search) {
        where.title = { [Op.iLike]: `%${search}%` };
      }
      // Exclude caller's own products from discovery
      if (myStoreId) {
        const storeConstraint = { [Op.ne]: myStoreId };
        where.storeId = filterStoreId
          ? { [Op.and]: [filterStoreId, storeConstraint] }
          : storeConstraint;
      }

      const { count, rows: products } = await Product.findAndCountAll({
        where,
        attributes: [
          'id', 'title', 'category', 'sku', 'gramWeight', 'milyem',
          'effectiveMilyem', 'gramHas', 'priceTRY', 'priceUSD',
          'b2bPrice', 'b2bDiscount', 'quantity', 'images', 'videoUrl',
          'hasVariants', 'variantAttributes', 'storeId', 'createdAt'
        ],
        include: [
          {
            model: Store,
            as: 'store',
            attributes: ['id', 'storeName', 'storeSlug']
          },
          {
            model: ProductVariant,
            as: 'variants',
            attributes: ['id', 'sku', 'attributes', 'gramWeight', 'quantity', 'priceTRY', 'priceUSD', 'b2bPrice'],
            required: false
          }
        ],
        limit,
        offset,
        order: [['createdAt', 'DESC']]
      });

      // Attach request status per product if caller has a store
      let requestMap: Record<string, string> = {};
      if (myStoreId && products.length > 0) {
        const productIds = products.map((p: any) => p.id);
        const existingRequests = await B2BRequest.findAll({
          where: { requesterStoreId: myStoreId, productId: { [Op.in]: productIds } },
          attributes: ['productId', 'status']
        });
        existingRequests.forEach((r: any) => {
          requestMap[r.productId] = r.status;
        });
      }

      const result = products.map((p: any) => ({
        ...p.toJSON(),
        store: {
          id: p.store?.id,
          name: p.store?.storeName,
          slug: p.store?.storeSlug
        },
        myRequestStatus: requestMap[p.id] || null
      }));

      return res.json({
        data: result,
        pagination: {
          page,
          limit,
          total: count,
          pages: Math.ceil(count / limit)
        }
      });
    } catch (error: any) {
      console.error('[B2B] getB2BProducts error:', error);
      return res.status(500).json({ error: 'B2B ürünleri alınamadı' });
    }
  }

  /**
   * GET /b2b/store/:storeSlug  (PUBLIC — no auth required)
   * Returns store info and its B2B products.
   * - Without auth: prices, stock hidden (backend enforced)
   * - With auth: all fields visible
   */
  static async getStoreProducts(req: Request, res: Response) {
    try {
      const { storeSlug } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 24;
      const offset = (page - 1) * limit;
      const isAuthenticated = !!(req as any).user;

      const store = await Store.findOne({
        where: { storeSlug, isActive: true },
        attributes: ['id', 'storeName', 'storeSlug', 'description', 'logo', 'banner', 'rating', 'totalProducts']
      });

      if (!store) {
        return res.status(404).json({ error: 'Mağaza bulunamadı' });
      }

      // Define which product attributes to return based on auth status
      const publicAttributes: string[] = [
        'id', 'title', 'category', 'gramWeight', 'milyem',
        'effectiveMilyem', 'images', 'hasVariants', 'createdAt'
      ];
      const authAttributes: string[] = [
        ...publicAttributes,
        'sku', 'gramHas', 'priceTRY', 'priceUSD',
        'b2bPrice', 'b2bDiscount', 'quantity', 'isB2BEnabled'
      ];

      const { count, rows: products } = await Product.findAndCountAll({
        where: { storeId: store.id, isActive: true, isB2BEnabled: true },
        attributes: isAuthenticated ? authAttributes : publicAttributes,
        limit,
        offset,
        order: [['createdAt', 'DESC']]
      });

      const result = products.map((p: any) => {
        const data = p.toJSON();
        // Double-ensure: strip price/stock for unauthenticated (defense in depth)
        if (!isAuthenticated) {
          delete data.priceTRY;
          delete data.priceUSD;
          delete data.b2bPrice;
          delete data.b2bDiscount;
          delete data.quantity;
          delete data.sku;
          delete data.gramHas;
          delete data.isB2BEnabled;
        }
        return data;
      });

      return res.json({
        store: store.toJSON(),
        isAuthenticated,
        data: result,
        pagination: {
          page,
          limit,
          total: count,
          pages: Math.ceil(count / limit)
        }
      });
    } catch (error: any) {
      console.error('[B2B] getStoreProducts error:', error);
      return res.status(500).json({ error: 'Mağaza ürünleri alınamadı' });
    }
  }


  /**
   * POST /b2b/requests
   * Seller requests to list a B2B product in their store.
   * Body: { productId, requestNote? }
   */
  static async createRequest(req: Request, res: Response) {
    try {
      // Use pre-cached store from sellerMiddleware
      const store = (req as any).store || await Store.findOne({ where: { userId: (req as any).user.id } });
      if (!store) return res.status(403).json({ error: 'Mağaza bulunamadı' });

      const { productId, variantId, requestNote } = req.body;
      if (!productId) return res.status(400).json({ error: 'productId gerekli' });

      const product = await Product.findByPk(productId, {
        include: [{ model: Store, as: 'store', attributes: ['id', ['storeName', 'name']] }]
      });
      if (!product || !product.isB2BEnabled) {
        return res.status(404).json({ error: 'B2B ürün bulunamadı' });
      }
      if ((product as any).storeId === store.id) {
        return res.status(400).json({ error: 'Kendi ürününüzü ekleyemezsiniz' });
      }

      if (variantId) {
        const variant = await ProductVariant.findByPk(variantId);
        if (!variant || variant.productId !== productId) {
          return res.status(404).json({ error: 'Belirtilen varyasyon bulunamadı veya bu ürüne ait değil' });
        }
      }

      const [request, created] = await B2BRequest.findOrCreate({
        where: variantId ? { productId, variantId, requesterStoreId: store.id } : { productId, requesterStoreId: store.id },
        defaults: {
          productId,
          variantId,
          requesterStoreId: store.id,
          ownerStoreId: (product as any).storeId,
          status: 'pending',
          requestNote
        }
      });

      if (!created) {
        return res.status(409).json({
          error: 'Bu ürün için zaten bir talep mevcut',
          status: request.status
        });
      }

      return res.status(201).json({
        message: 'Talep gönderildi. Ürün sahibinin onayı bekleniyor.',
        request
      });
    } catch (error: any) {
      console.error('[B2B] createRequest error:', error);
      return res.status(500).json({ error: 'Talep oluşturulamadı' });
    }
  }

  /**
   * GET /b2b/requests/incoming
   * Stock owner sees all requests for their products.
   */
  static async getIncomingRequests(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const store = user ? await Store.findOne({ where: { userId: user.id } }) : null;
      if (!store) return res.status(403).json({ error: 'Mağaza bulunamadı' });

      const requests = await B2BRequest.findAll({
        where: { ownerStoreId: store.id },
        include: [
          {
            model: Product,
            as: 'product',
            attributes: ['id', 'title', 'priceTRY', 'b2bPrice', 'images', 'category']
          },
          {
            model: ProductVariant,
            as: 'variant'
          },
          {
            model: Store,
            as: 'requesterStore',
            attributes: ['id', ['storeName', 'name']]
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      return res.json(requests);
    } catch (error: any) {
      console.error('[B2B] getIncomingRequests error:', error);
      return res.status(500).json({ error: 'Gelen talepler alınamadı' });
    }
  }

  /**
   * GET /b2b/requests/outgoing
   * Requesting seller sees their own requests and statuses.
   */
  static async getOutgoingRequests(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const store = user ? await Store.findOne({ where: { userId: user.id } }) : null;
      if (!store) return res.status(403).json({ error: 'Mağaza bulunamadı' });

      const requests = await B2BRequest.findAll({
        where: { requesterStoreId: store.id },
        include: [
          {
            model: Product,
            as: 'product',
            attributes: ['id', 'title', 'priceTRY', 'b2bPrice', 'b2bDiscount', 'images', 'category']
          },
          {
            model: ProductVariant,
            as: 'variant'
          },
          {
            model: Store,
            as: 'ownerStore',
            attributes: ['id', ['storeName', 'name']]
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      return res.json(requests);
    } catch (error: any) {
      console.error('[B2B] getOutgoingRequests error:', error);
      return res.status(500).json({ error: 'Gönderilen talepler alınamadı' });
    }
  }

  /**
   * PUT /b2b/requests/:id/approve
   * Stock owner approves a pending request.
   */
  static async approveRequest(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const store = user ? await Store.findOne({ where: { userId: user.id } }) : null;
      if (!store) return res.status(403).json({ error: 'Mağaza bulunamadı' });

      const request = await B2BRequest.findOne({
        where: { id: req.params.id, ownerStoreId: store.id }
      });
      if (!request) return res.status(404).json({ error: 'Talep bulunamadı' });
      if (request.status !== 'pending') {
        return res.status(400).json({ error: `Talep zaten ${request.status} durumunda` });
      }

      await request.update({ status: 'approved' });
      return res.json({ message: 'Talep onaylandı', request });
    } catch (error: any) {
      console.error('[B2B] approveRequest error:', error);
      return res.status(500).json({ error: 'Onay işlemi başarısız' });
    }
  }

  /**
   * PUT /b2b/requests/:id/reject
   * Stock owner rejects a pending request.
   */
  static async rejectRequest(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const store = user ? await Store.findOne({ where: { userId: user.id } }) : null;
      if (!store) return res.status(403).json({ error: 'Mağaza bulunamadı' });

      const request = await B2BRequest.findOne({
        where: { id: req.params.id, ownerStoreId: store.id }
      });
      if (!request) return res.status(404).json({ error: 'Talep bulunamadı' });
      if (request.status !== 'pending') {
        return res.status(400).json({ error: `Talep zaten ${request.status} durumunda` });
      }

      await request.update({ status: 'rejected' });
      return res.json({ message: 'Talep reddedildi', request });
    } catch (error: any) {
      console.error('[B2B] rejectRequest error:', error);
      return res.status(500).json({ error: 'Red işlemi başarısız' });
    }
  }
  /**
   * POST /b2b/requests/:id/list
   * Requester lists the approved product in their store with a custom profit margin.
   */
  static async listB2BProduct(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const store = user ? await Store.findOne({ where: { userId: user.id } }) : null;
      if (!store) return res.status(403).json({ error: 'Mağaza bulunamadı' });

      const request = await B2BRequest.findOne({
        where: { id: req.params.id, requesterStoreId: store.id, status: 'approved' }
      });
      if (!request) return res.status(404).json({ error: 'Onaylanmış talep bulunamadı' });

      const originalProduct = await Product.findByPk(request.productId, {
        include: [{ model: Store, as: 'store', attributes: ['id', ['storeName', 'name']] }]
      });
      if (!originalProduct) return res.status(404).json({ error: 'Orijinal ürün bulunamadı' });

      let baseB2BPrice = originalProduct.b2bPrice;
      let gramWeight = originalProduct.gramWeight;
      let milyem = originalProduct.milyem;
      
      let variantDescription = '';
      if (request.variantId) {
         const variant = await ProductVariant.findByPk(request.variantId);
         if (variant) {
            baseB2BPrice = variant.b2bPrice || originalProduct.b2bPrice;
            gramWeight = variant.gramWeight;
            
            const variantAttributesText = Object.entries(variant.attributes)
                .map(([k, v]) => `${k}: ${v}`)
                .join(', ');
            variantDescription = `\nSeçili Varyasyon Özellikleri: ${variantAttributesText}`;
         }
      }

      const { profitMargin, marketplaces } = req.body;
      if (profitMargin === undefined) return res.status(400).json({ error: 'Kâr oranı gerekli' });

      const priceTRY = Math.round(baseB2BPrice * (1 + profitMargin / 100) * 100) / 100;
      const currentGold = await goldPriceService.getCurrentGoldPrice();
      const priceUSD = Math.round((priceTRY / currentGold.usdTryRate) * 100) / 100;

      const ownerName = (originalProduct as any).store?.dataValues?.name || 'B2B Tedarikçisi';
      let b2bDescription = originalProduct.description + variantDescription + `\n\n---\nBu ürün B2B tedarik ağından (${ownerName}) listelenmektedir.`;
      
      const newSku = `${originalProduct.sku}-B2B-${store.id.substring(0, 4)}${request.variantId ? '-VAR' : ''}`;

      const newProduct = await Product.create({
        storeId: store.id,
        title: originalProduct.title,
        slug: `${originalProduct.slug}-b2b-${Date.now()}`,
        description: b2bDescription,
        category: originalProduct.category,
        sku: newSku,
        gramWeight: gramWeight,
        milyem: milyem,
        profitMargin: profitMargin,
        priceTRY,
        priceUSD,
        isB2BEnabled: false,
        b2bDiscount: 0,
        b2bPrice: 0,
        quantity: originalProduct.quantity,
        images: originalProduct.images,
        videoUrl: originalProduct.videoUrl,
        marketplaces: marketplaces || [],
        hasVariants: false,
        variantAttributes: [],
        tags: [...(originalProduct.tags || []), 'B2B'],
        originalStoreName: ownerName,
        originalProductId: originalProduct.id,
        isActive: true
      });

      return res.json({ message: 'Ürün başarıyla listelendi!', product: newProduct });
    } catch (error: any) {
      console.error('[B2B] listB2BProduct error:', error);
      return res.status(500).json({ error: 'Ürün listelenemedi' });
    }
  }
}

export default B2BController;
