import { Request, Response } from 'express';
import { Product, Store, ProductVariant } from '../models';
import { Op, Sequelize, WhereOptions } from 'sequelize';

// Reusable golden marketplace filter as a raw SQL literal condition.
// Using Op.and with a Sequelize.literal keeps it compatible with WhereOptions.
const goldenFilter: WhereOptions = {
  [Op.and]: Sequelize.literal(
    `CAST("marketplaces" AS text) ILIKE '%golden%'`
  )
};

function applyTranslation(product: any, lang: string): any {
  if (!product) return product;
  const json = product.toJSON ? product.toJSON() : product;
  const translations = json.translations || {};
  const defaultLang = json.defaultLanguage || 'en';
  const trans = translations[lang] || {};

  return {
    ...json,
    title: trans.title || json.title,
    description: trans.description || json.description,
    _lang: lang,
    _defaultLang: defaultLang,
  };
}

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
      const sort = req.query.sort as string;
      const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice as string) : null;
      const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : null;
      const lang = (req.query.lang as string) || 'en';

      const where: WhereOptions = {
        isActive: true,
        ...goldenFilter
      };
      
      if (search) where.title = { [Op.iLike]: `%${search}%` };
      if (category) {
        const categoryVariants: Record<string, string[]> = {
          rings: ['rings', 'yüzük', 'yuzuk', 'anelli', 'anelli', 'خواتم', 'khatim', 'anillos'],
          necklaces: ['necklaces', 'kolye', 'collane', 'قلائد', 'qalayed', 'collares'],
          bracelets: ['bracelets', 'bilezik', 'bracciali', 'أساور', 'asawer', 'pulseras'],
          earrings: ['earrings', 'küpe', 'kupe', 'orecchini', 'أقراط', 'aqrat', 'aretes'],
          pendants: ['pendants', 'kolye ucu', 'kolye-ucu', 'ciondoli', 'pendenti', 'دلايات', 'dulaya', 'colgantes'],
          sets: ['sets', 'takı seti', 'taki seti', 'taki-seti', 'set', 'مجموعات', 'majmueat', 'juegos'],
        };

        const catLower = category.toLowerCase().trim();
        let allTerms: string[] = [catLower, category];

        for (const [, terms] of Object.entries(categoryVariants)) {
          if (terms.some(t => t === catLower || t.includes(catLower) || catLower.includes(t))) {
            allTerms = [...new Set([...allTerms, ...terms])];
            break;
          }
        }

        where.category = {
          [Op.or]: allTerms.map(term => ({ [Op.iLike]: `%${term}%` }))
        };
      }
      if (minPrice !== null || maxPrice !== null) {
        where.priceTRY = {};
        if (minPrice !== null) (where.priceTRY as any)[Op.gte] = minPrice;
        if (maxPrice !== null) (where.priceTRY as any)[Op.lte] = maxPrice;
      }

      let order: any[] = [['createdAt', 'DESC']];
      if (sort === 'price_asc') order = [['priceTRY', 'ASC']];
      else if (sort === 'price_desc') order = [['priceTRY', 'DESC']];
      else if (sort === 'popular') order = [['createdAt', 'DESC']];

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
        attributes: ['id', 'title', 'slug', 'category', 'priceTRY', 'priceUSD', 'images', 'createdAt', 'translations', 'defaultLanguage', 'description', 'discountRate'],
        include: [includeStore],
        limit,
        offset,
        order
      });

      const translated = products.map(p => applyTranslation(p, lang));

      return res.json({
        data: translated,
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
      const lang = (req.query.lang as string) || 'en';

      const product = await Product.findOne({
        where: { slug, isActive: true },
        attributes: ['id', 'title', 'description', 'slug', 'category', 'priceTRY', 'priceUSD', 'images', 'createdAt', 'translations', 'defaultLanguage', 'sku', 'quantity', 'weight', 'marketplaces', 'features'],
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
      return res.json(applyTranslation(product, lang));
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
          ...goldenFilter
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
  static async getCategories(_req: Request, res: Response) {
    try {
      const results = await Product.findAll({
        where: {
          isActive: true,
          ...goldenFilter
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
