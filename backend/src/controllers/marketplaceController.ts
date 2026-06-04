import { Request, Response } from 'express';
import { Product, Store, ProductVariant, Category } from '../models';
import { Op, Sequelize, WhereOptions } from 'sequelize';

// Reusable golden marketplace filter as a raw SQL literal condition.
// Using Op.and with a Sequelize.literal keeps it compatible with WhereOptions.
const goldenFilter: WhereOptions = {
  [Op.and]: Sequelize.literal(
    `CAST("marketplaces" AS text) ILIKE '%golden%'`
  )
};

// Fallback translations for category strings that aren't linked to the Category model.
// Used when a product's categoryId is null and only the raw category string is available.
const FALLBACK_CATEGORY_TRANSLATIONS: Record<string, Record<string, string>> = {
  Genel: { en: 'General', tr: 'Genel', it: 'Generale', es: 'General', ar: 'عام' },
  General: { en: 'General', tr: 'Genel', it: 'Generale', es: 'General', ar: 'عام' },
  Bilezik: { en: 'Bracelets', tr: 'Bilezik', it: 'Bracciali', es: 'Pulseras', ar: 'أساور' },
  Bracelets: { en: 'Bracelets', tr: 'Bilezik', it: 'Bracciali', es: 'Pulseras', ar: 'أساور' },
  bracelet: { en: 'Bracelets', tr: 'Bilezik', it: 'Bracciali', es: 'Pulseras', ar: 'أساور' },
  Yüzük: { en: 'Rings', tr: 'Yüzük', it: 'Anelli', es: 'Anillos', ar: 'خواتم' },
  Rings: { en: 'Rings', tr: 'Yüzük', it: 'Anelli', es: 'Anillos', ar: 'خواتم' },
  rings: { en: 'Rings', tr: 'Yüzük', it: 'Anelli', es: 'Anillos', ar: 'خواتم' },
  Kolye: { en: 'Necklaces', tr: 'Kolye', it: 'Collane', es: 'Collares', ar: 'قلائد' },
  Necklaces: { en: 'Necklaces', tr: 'Kolye', it: 'Collane', es: 'Collares', ar: 'قلائد' },
  necklaces: { en: 'Necklaces', tr: 'Kolye', it: 'Collane', es: 'Collares', ar: 'قلائد' },
  Küpe: { en: 'Earrings', tr: 'Küpe', it: 'Orecchini', es: 'Aretes', ar: 'أقراط' },
  Earrings: { en: 'Earrings', tr: 'Küpe', it: 'Orecchini', es: 'Aretes', ar: 'أقراط' },
  earrings: { en: 'Earrings', tr: 'Küpe', it: 'Orecchini', es: 'Aretes', ar: 'أقراط' },
  'Kolye Ucu': { en: 'Pendants', tr: 'Kolye Ucu', it: 'Ciondoli', es: 'Colgantes', ar: 'دلايات' },
  Pendants: { en: 'Pendants', tr: 'Kolye Ucu', it: 'Ciondoli', es: 'Colgantes', ar: 'دلايات' },
  pendants: { en: 'Pendants', tr: 'Kolye Ucu', it: 'Ciondoli', es: 'Colgantes', ar: 'دلايات' },
  'Takı Seti': { en: 'Sets', tr: 'Takı Seti', it: 'Set', es: 'Juegos', ar: 'مجموعات' },
  Sets: { en: 'Sets', tr: 'Takı Seti', it: 'Set', es: 'Juegos', ar: 'مجموعات' },
  sets: { en: 'Sets', tr: 'Takı Seti', it: 'Set', es: 'Juegos', ar: 'مجموعات' },
};

function resolveCategoryName(rawCategory: string, categoryRef: any, lang: string): string {
  if (categoryRef) {
    const catTranslations = categoryRef.translations || {};
    return catTranslations[lang]?.name || categoryRef.name || rawCategory;
  }
  return FALLBACK_CATEGORY_TRANSLATIONS[rawCategory]?.[lang] || rawCategory;
}

function applyTranslation(product: any, lang: string): any {
  if (!product) return product;
  const json = product.toJSON ? product.toJSON() : product;
  const translations = json.translations || {};
  const defaultLang = json.defaultLanguage || 'en';
  const trans = translations[lang] || {};

  const categoryName = resolveCategoryName(json.category, json.categoryRef, lang);

  const { categoryRef, ...rest } = json;

  return {
    ...rest,
    title: trans.title || json.title,
    description: trans.description || json.description,
    _categoryName: categoryName,
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
      const hideOutOfStock = req.query.hideOutOfStock === 'true';
      const lang = (req.query.lang as string) || 'en';

      const where: WhereOptions = {
        isActive: true,
        ...goldenFilter
      };
      
      if (hideOutOfStock) where.quantity = { [Op.gt]: 0 };
      if (search) where.title = { [Op.iLike]: `%${search}%` };
      if (category) {
        const catBySlug = await Category.findOne({ where: { slug: category } });
        if (catBySlug) {
          where.categoryId = catBySlug.id;
        } else {
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
        attributes: ['id', 'title', 'slug', 'category', 'categoryId', 'priceTRY', 'priceUSD', 'images', 'createdAt', 'translations', 'defaultLanguage', 'description', 'discountRate'],
        include: [
          includeStore,
          { model: Category, as: 'categoryRef', attributes: ['id', 'name', 'translations', 'slug'] }
        ],
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
        attributes: ['id', 'title', 'description', 'slug', 'category', 'categoryId', 'priceTRY', 'priceUSD', 'images', 'createdAt', 'translations', 'defaultLanguage', 'sku', 'quantity', 'gramWeight', 'marketplaces'],
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
          },
          { model: Category, as: 'categoryRef', attributes: ['id', 'name', 'translations', 'slug'] }
        ]
      });

      if (!product) return res.status(404).json({ error: 'Product not found' });
      return res.json(applyTranslation(product, lang));
    } catch (error: any) {
      console.error('[Marketplace] getProductBySlug error:', error);
      return res.status(500).json({ error: 'Failed to fetch product details', details: error?.message || String(error) });
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
        attributes: ['id', 'title', 'slug', 'category', 'categoryId', 'priceTRY', 'priceUSD', 'images', 'createdAt', 'translations', 'defaultLanguage'],
        include: [
          { model: Category, as: 'categoryRef', attributes: ['id', 'name', 'translations', 'slug'] }
        ],
        limit,
        offset,
        order: [['createdAt', 'DESC']]
      });

      return res.json({
        store,
        data: products.map(p => applyTranslation(p, req.query.lang as string || 'en')),
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
      const lang = (_req.query.lang as string) || 'en';

      // 1) Categories by categoryId (clean path — products linked to admin categories)
      const [idResults, stringResults] = await Promise.all([
        Product.findAll({
          where: {
            isActive: true,
            [Op.and]: [
              Sequelize.literal('"categoryId" IS NOT NULL AND CAST("marketplaces" AS text) ILIKE \'%golden%\'')
            ]
          },
          attributes: [
            'categoryId',
            [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
          ],
          group: ['categoryId'],
          order: [[Sequelize.literal('count'), 'DESC']],
          raw: true
        }),
        // 2) Legacy: products with only a raw category string (no categoryId)
        Product.findAll({
          where: {
            isActive: true,
            [Op.and]: [
              Sequelize.literal('"categoryId" IS NULL AND CAST("marketplaces" AS text) ILIKE \'%golden%\'')
            ]
          },
          attributes: [
            [Sequelize.fn('DISTINCT', Sequelize.col('category')), 'category'],
            [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
          ],
          group: ['category'],
          order: [[Sequelize.literal('count'), 'DESC']],
          raw: true
        })
      ]);

      const mapped: { name: string; slug: string; count: number }[] = [];

      // Resolve categoryId → Category name + translations
      if (idResults.length > 0) {
        const catIds: string[] = (idResults as any[]).map((r: any) => r.categoryId).filter(Boolean);
        const cats = await Category.findAll({ where: { id: catIds } });
        const catMap = new Map(cats.map(c => [c.id, c]));

        for (const r of idResults as any[]) {
          const cat = catMap.get(r.categoryId);
          if (cat) {
            const trans = cat.translations || {};
            mapped.push({
              name: trans[lang]?.name || cat.name,
              slug: cat.slug,
              count: parseInt(r.count)
            });
          }
        }
      }

      // Legacy raw-string categories
      for (const r of stringResults as any[]) {
        const raw = r.category;
        let slug = raw;

        try {
          const cat = await Category.findOne({ where: { [Op.or]: [{ slug: raw }, { name: raw }] } });
          if (cat) slug = cat.slug;
        } catch (e) {
          // ignore
        }

        mapped.push({
          name: resolveCategoryName(raw, null, lang),
          slug,
          count: parseInt(r.count)
        });
      }

      // Deduplicate by slug (prefer categoryId-resolved entries first)
      const seen = new Set<string>();
      const deduped = mapped.filter(c => {
        if (seen.has(c.slug)) return false;
        seen.add(c.slug);
        return true;
      });

      return res.json({ data: deduped });
    } catch (error) {
      console.error('[Marketplace] getCategories error:', error);
      return res.status(500).json({ error: 'Failed to fetch categories' });
    }
  }
}

export default MarketplaceController;
