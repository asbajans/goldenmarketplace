import { Request, Response } from 'express';
import { Product, Store, ProductVariant } from '../models';
import { Op, Sequelize } from 'sequelize';

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

      // Cast JSON to text for safe LIKE query across Postgres/SQLite
      const where: any = { 
        isActive: true,
        marketplaces: Sequelize.where(
          Sequelize.cast(Sequelize.col('marketplaces'), 'text'),
          { [Op.like]: '%"golden"%' }
        )
      };
      
      if (search) {
        where.title = { [Op.iLike]: `%${search}%` };
      }

      const { count, rows: products } = await Product.findAndCountAll({
        where,
        attributes: [
          'id', 'title', 'slug', 'category', 'priceTRY', 'priceUSD', 'images', 'isB2BEnabled', 'createdAt'
        ],
        include: [
          {
            model: Store,
            as: 'store',
            attributes: ['id', 'storeName', 'storeSlug', 'logo']
          }
        ],
        limit,
        offset,
        order: [['createdAt', 'DESC']]
      });

      return res.json({
        data: products,
        pagination: {
          page,
          limit,
          total: count,
          pages: Math.ceil(count / limit)
        }
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
            attributes: ['id', 'storeName', 'storeSlug', 'logo', 'description']
          },
          {
            model: ProductVariant,
            as: 'variants',
            attributes: ['id', 'sku', 'attributes', 'priceTRY', 'priceUSD', 'quantity']
          }
        ]
      });

      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      return res.json(product);
    } catch (error) {
      console.error('[Marketplace] getProductBySlug error:', error);
      return res.status(500).json({ error: 'Failed to fetch product details' });
    }
  }
}

export default MarketplaceController;
