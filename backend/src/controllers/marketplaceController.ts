import { Request, Response } from 'express';
import { Product, Store, ProductVariant } from '../models';
import { Op, Sequelize } from 'sequelize';

// Reusable golden marketplace filter
const goldenFilter = Sequelize.where(
  Sequelize.cast(Sequelize.col('marketplaces'), 'text'),
  { [Op.iLike]: '%golden%' }
);

export class MarketplaceController {
  
  /**
   * GET /api/marketplace/products
   * Public discovery for B2C frontend.
   */
  static async getProducts(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 24;
      const offset = (page - 1) * limit;
      const search = req.query.search as string;
      const category = req.query.category as string;
      const storeSlug = req.query.storeSlug as string;

      const where: any = { 
        isActive: true,
        marketplaces: goldenFilter
      };
      
      if (search) where.title = { [Op.iLike]: `%${search}%` };
      if (category) where.category = { [Op.iLike]: `%${category}%` };

      const includeStore: any = {
        model: Store,
        as: 'store',
        attributes: ['id', 'storeName', 'storeSlug', 'logo']
      };
      if (storeSlug) {
        includeStore.where = { storeSlug };
        includeStore.required = true;
      }

      const { count, rows: products } = await Product.findAndCountAll({
        where,
        attributes: ['id', 'title', 'slug', 'category', 'priceTRY', 'priceUSD', 'images', 'createdAt'],
        include: [includeStore],
        limit,
        offset,
        order: [['createdAt', 'DESC']]
      });

      return res.json({
        data: products,
        pagination: { page, limit, total: count, pages: Math.ceil(count / limit) }
      });
    } catch (error) {
      console.error('[Marketplace] getProducts error:', error);
      return res.status(500).json({ error: 'Failed to fetch public products' });
    }
  }

  /**
   * GET /api/marketplace/products/:slug
   */
  static async getProductBySlug(req: Request, res: Response) {
    try {
      const { slug } = req.params;

      const product = await Product.findOne({
        where: { slug, isActive: true },
        include: [
          {
            model: Store,
            as: 'store',
            attributes: ['id', 'storeName', 'storeSlug', 'logo', 'description', 'rating', 'totalProducts']
          },
          {
            model: ProductVariant,
            as: 'variants',
            attributes: ['id', 'sku', 'attributes', 'priceTRY', 'priceUSD', 'quantity']
          }
        ]
      });

      if (!product) return res.status(404).json({ error: 'Product not found' });
      return res.json(product);
    } catch (error) {
      console.error('[Marketplace] getProductBySlug error:', error);
      return res.status(500).json({ error: 'Failed to fetch product details' });
    }
  }

  /**
   * GET /api/marketplace/stores
   * Public store listing for B2C frontend.
   */
  static async getStores(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 24;
      const offset = (page - 1) * limit;
      const search = req.query.search as string;

      const where: any = { isActive: true };
      if (search) where.storeName = { [Op.iLike]: `%${search}%` };

      const { count, rows: stores } = await Store.findAndCountAll({
        where,
        attributes: ['id', 'storeName', 'storeSlug', 'description', 'logo', 'banner', 'rating', 'totalProducts', 'createdAt'],
        limit,
        offset,
        order: [['totalProducts', 'DESC']]
      });

      return res.json({
        data: stores,
        pagination: { page, limit, total: count, pages: Math.ceil(count / limit) }
      });
    } catch (error) {
      console.error('[Marketplace] getStores error:', error);
      return res.status(500).json({ error: 'Failed to fetch stores' });
    }
  }

  /**
   * GET /api/marketplace/stores/:storeSlug
   * Single store detail with products.
   */
  static async getStoreBySlug(req: Request, res: Response) {
    try {
      const { storeSlug } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 24;
      const offset = (page - 1) * limit;

      const store = await Store.findOne({
        where: { storeSlug, isActive: true },
        attributes: ['id', 'storeName', 'storeSlug', 'description', 'logo', 'banner', 'rating', 'totalProducts', 'createdAt']
      });

      if (!store) return res.status(404).json({ error: 'Store not found' });

      const { count, rows: products } = await Product.findAndCountAll({
        where: {
          storeId: (store as any).id,
          isActive: true,
          marketplaces: goldenFilter
        },
        attributes: ['id', 'title', 'slug', 'category', 'priceTRY', 'priceUSD', 'images', 'createdAt'],
        limit,
        offset,
        order: [['createdAt', 'DESC']]
      });

      return res.json({
        store,
        data: products,
        pagination: { page, limit, total: count, pages: Math.ceil(count / limit) }
      });
    } catch (error) {
      console.error('[Marketplace] getStoreBySlug error:', error);
      return res.status(500).json({ error: 'Failed to fetch store' });
    }
  }

  /**
   * GET /api/marketplace/categories
   * Returns distinct categories from active golden products.
   */
  static async getCategories(req: Request, res: Response) {
    try {
      const results = await Product.findAll({
        where: {
          isActive: true,
          marketplaces: goldenFilter
        },
        attributes: [
          [Sequelize.fn('DISTINCT', Sequelize.col('category')), 'category'],
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
        ],
        group: ['category'],
        order: [[Sequelize.literal('count'), 'DESC']],
        raw: true
      });

      return res.json({
        data: results.map((r: any) => ({
          name: r.category,
          count: parseInt(r.count)
        }))
      });
    } catch (error) {
      console.error('[Marketplace] getCategories error:', error);
      return res.status(500).json({ error: 'Failed to fetch categories' });
    }
  }
}

export default MarketplaceController;
