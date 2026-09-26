import { Request, Response } from 'express';
import { Op } from 'sequelize';
import Product from '../models/Product';
import Store from '../models/Store';
import { GlobalSetting } from '../models/GlobalSetting';

const SITE_URL = process.env.SITE_URL || 'https://goldencrafters.com';
const LANGUAGES = ['en', 'tr', 'it', 'ar', 'es'];

// Google Merchant zorunlu varyant alanları
const FEED_GENDERS = ['male', 'female', 'unisex'];
const FEED_AGE_GROUPS = ['newborn', 'infant', 'toddler', 'kids', 'adult'];
const FEED_FALLBACK_GENDER = 'unisex';
const FEED_FALLBACK_AGE_GROUP = 'adult';
const FEED_FALLBACK_COLOR = 'Gold';

function resolveFeedGender(raw: unknown, def: unknown): string {
    const v = String(raw || '').trim().toLowerCase();
    if (FEED_GENDERS.includes(v)) return v;
    const d = String(def || '').trim().toLowerCase();
    if (FEED_GENDERS.includes(d)) return d;
    return FEED_FALLBACK_GENDER;
}

function resolveFeedAgeGroup(raw: unknown, def: unknown): string {
    const v = String(raw || '').trim().toLowerCase();
    if (FEED_AGE_GROUPS.includes(v)) return v;
    const d = String(def || '').trim().toLowerCase();
    if (FEED_AGE_GROUPS.includes(d)) return d;
    return FEED_FALLBACK_AGE_GROUP;
}

function resolveFeedColor(raw: unknown, def: unknown): string {
    const v = String(raw || '').trim();
    if (v) return v;
    const d = String(def || '').trim();
    if (d) return d;
    return FEED_FALLBACK_COLOR;
}

function escapeXml(input: unknown): string {
    return String(input ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

export class FeedController {
    /**
     * Google Shopping XML Feed
     * Endpoint: GET /api/feed/google.xml (all products)
     *           GET /api/feed/google/:storeSlug.xml (per-store, deprecated)
     */
    static async googleShoppingFeed(req: Request, res: Response) {
        try {
            const { storeSlug } = req.params;
            let whereClause: any = { isActive: true };
            let storeName = 'Golden Crafters';

            // Load global merchant settings (+ feed defaults for gender/age_group/color)
            const settings = await GlobalSetting.findAll({
                where: {
                    key: {
                        [Op.in]: [
                            'merchant_center_id',
                            'merchant_target_country',
                            'merchant_target_language',
                            'feed_default_gender',
                            'feed_default_age_group',
                            'feed_default_color'
                        ]
                    }
                }
            });
            const settingsMap: Record<string, string> = {};
            for (const s of settings) settingsMap[s.key] = s.value;

            const merchantId = settingsMap.merchant_center_id || '';
            const targetCountry = (settingsMap.merchant_target_country || 'TR').toUpperCase();
            const defaultGender = settingsMap.feed_default_gender || FEED_FALLBACK_GENDER;
            const defaultAgeGroup = settingsMap.feed_default_age_group || FEED_FALLBACK_AGE_GROUP;
            const defaultColor = settingsMap.feed_default_color || FEED_FALLBACK_COLOR;

            if (storeSlug) {
                const store = await Store.findOne({ where: { storeSlug, isActive: true } });
                if (!store) return res.status(404).send('Store not found');
                whereClause.storeId = store.id;
                storeName = store.storeName;
            }

            const products = await Product.findAll({
                where: whereClause,
                limit: 20000,
                include: [{ model: Store, as: 'store', attributes: ['storeName', 'storeSlug'] }]
            });

            let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
<channel>
  <title>${storeName}</title>
  <link>${SITE_URL}</link>
  <description>Premium Gold Jewelry Marketplace</description>`;

            for (const product of products) {
                const primaryImage = product.images?.[0] || `${SITE_URL}/images/placeholder.jpg`;
                const additionalImages = (product.images?.slice(1) || []).slice(0, 10);
                const translations: Record<string, any> = (product as any).translations || {};

                // Price with discount handling
                const originalPrice = Number(product.priceTRY) || 0;
                const discountRate = Number((product as any).discountRate) || 0;
                const salePrice = discountRate > 0 ? originalPrice * (1 - discountRate / 100) : 0;
                const priceTRY = salePrice > 0 ? salePrice : originalPrice;

                // Generate language-specific entries
                for (const lang of LANGUAGES) {
                    const langStore = (product as any).store?.storeName || storeName;
                    const translated = translations[lang] || {};
                    const title = translated.title || product.title;
                    const description = (translated.description || product.description || '')
                        .replace(/<[^>]*>/g, '')
                        .substring(0, 5000);

                    xml += `
  <item>
    <g:id>${product.id}_${lang}</g:id>
    <g:title><![CDATA[${title}]]></g:title>
    <g:description><![CDATA[${description}]]></g:description>
    <g:link>${SITE_URL}/${lang}/p/${product.slug}</g:link>
    <g:image_link>${primaryImage}</g:image_link>`;

                    // Additional images
                    for (const img of additionalImages) {
                        xml += `
    <g:additional_image_link>${img}</g:additional_image_link>`;
                    }

                    xml += `
    <g:price>${priceTRY.toFixed(2)} TRY</g:price>`;

                    // Sale price (discount)
                    if (salePrice > 0) {
                        xml += `
    <g:sale_price>${salePrice.toFixed(2)} TRY</g:sale_price>`;
                    }

                    // Tax (Turkey KDV)
                    xml += `
    <g:tax>
      <g:country>${targetCountry}</g:country>
      <g:rate>20.0</g:rate>
      <g:tax_ship>y</g:tax_ship>
    </g:tax>`;

                    // Shipping weight (grams -> kg for Google)
                    const gramWeight = Number(product.gramWeight) || 0;
                    const shippingWeightKg = gramWeight > 0 ? (gramWeight / 1000).toFixed(3) : '0.100';
                    xml += `
    <g:shipping_weight>${shippingWeightKg} kg</g:shipping_weight>`;

                    // Shipping cost based on weight
                    const shipCost = gramWeight > 0
                        ? Math.max(49.90, Math.round(gramWeight * 0.5 * 100) / 100)
                        : 49.90;
                    xml += `
    <g:shipping>
      <g:country>${targetCountry}</g:country>
      <g:service>Standard</g:service>
      <g:price>${shipCost.toFixed(2)} TRY</g:price>
    </g:shipping>`;

                    // In-store pickup option
                    xml += `
    <g:shipping>
      <g:country>${targetCountry}</g:country>
      <g:service>Store Pickup</g:service>
      <g:price>0.00 TRY</g:price>
    </g:shipping>`;

                    // Availability
                    const qty = Number(product.quantity) || 0;
                    const availability = qty > 0 ? 'in_stock' : 'out_of_stock';
                    // Google zorunlu alanları: ürün değeri yoksa admin varsayılanı kullanılır
                    const feedGender = resolveFeedGender((product as any).gender, defaultGender);
                    const feedAgeGroup = resolveFeedAgeGroup((product as any).ageGroup, defaultAgeGroup);
                    const feedColor = resolveFeedColor((product as any).color, defaultColor);
                    xml += `
    <g:availability>${availability}</g:availability>
    <g:condition>new</g:condition>
    <g:brand><![CDATA[${langStore}]]></g:brand>
    <g:mpn>${product.sku || product.id}</g:mpn>
    <g:product_type><![CDATA[${product.category || 'Jewelry'}]]></g:product_type>
    <g:google_product_category>188</g:google_product_category>
    <g:gender>${feedGender}</g:gender>
    <g:age_group>${feedAgeGroup}</g:age_group>
    <g:color><![CDATA[${feedColor}]]></g:color>
    <g:identifier_exists>FALSE</g:identifier_exists>`;

                    if (merchantId) {
                        xml += `
    <g:merchant>${merchantId}</g:merchant>`;
                    }

                    xml += `
  </item>`;
                }
            }

            xml += `
</channel>
</rss>`;

            res.set('Content-Type', 'application/xml; charset=utf-8');
            return res.send(xml);
        } catch (error) {
            console.error('Google Feed Error:', error);
            return res.status(500).json({ error: 'Failed to generate feed' });
        }
    }

    /**
     * Facebook Product Catalog Feed (JSON)
     * Endpoints: GET /api/feed/facebook.json, /api/feed/instagram.json
     */
    static async facebookCatalogFeed(_req: Request, res: Response) {
        try {
            const whereClause: any = { isActive: true };
            const products = await Product.findAll({
                where: whereClause,
                limit: 5000
            });
            const feedDefaults = await GlobalSetting.findAll({
                where: { key: { [Op.in]: ['feed_default_gender', 'feed_default_age_group', 'feed_default_color'] } }
            });
            const defaultsMap: Record<string, string> = {};
            for (const s of feedDefaults) defaultsMap[s.key] = s.value;

            const catalog = products.map(product => ({
                id: product.id,
                title: product.title,
                description: (product.description || '').replace(/<[^>]*>/g, '').substring(0, 5000),
                availability: product.quantity > 0 ? 'in stock' : 'out of stock',
                condition: 'new',
                price: `${Number(product.priceTRY).toFixed(2)} TRY`,
                sale_price: (product as any).discountRate > 0
                    ? `${(Number(product.priceTRY) * (1 - Number((product as any).discountRate) / 100)).toFixed(2)} TRY`
                    : undefined,
                link: `${SITE_URL}/p/${product.slug}`,
                image_link: product.images?.[0] || `${SITE_URL}/images/placeholder.jpg`,
                additional_image_link: product.images?.slice(1).join(',') || undefined,
                brand: 'Golden Crafters',
                google_product_category: '188',
                mpn: product.sku || product.id,
                gender: resolveFeedGender((product as any).gender, defaultsMap.feed_default_gender || FEED_FALLBACK_GENDER),
                age_group: resolveFeedAgeGroup((product as any).ageGroup, defaultsMap.feed_default_age_group || FEED_FALLBACK_AGE_GROUP),
                color: resolveFeedColor((product as any).color, defaultsMap.feed_default_color || FEED_FALLBACK_COLOR)
            }));

            return res.json({ data: catalog });
        } catch (error) {
            console.error('Facebook Feed Error:', error);
            return res.status(500).json({ error: 'Failed to generate feed' });
        }
    }

    /**
     * Google Product Ratings Feed (XML)
     * Endpoint: GET /api/feed/product_reviews.xml
     * Merchant Center → Product Ratings programına kaynak olarak eklenir.
     * Sadece ONAYLI gerçek yorumları içerir (sahte değerlendirme yasaktır).
     */
    static async productRatingsFeed(_req: Request, res: Response) {
        try {
            const { default: ProductReview } = await import('../models/ProductReview');
            const reviews = await ProductReview.findAll({
                where: { isApproved: true },
                order: [['createdAt', 'DESC']],
                limit: 5000,
                include: [{
                    model: Product,
                    as: 'product',
                    attributes: ['id', 'title', 'slug', 'sku'],
                    where: { isActive: true },
                    required: true
                }]
            });

            let xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:vc="http://www.w3.org/2007/XMLSchema-versioning" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://www.google.com/shopping/reviews/schema/product/2.3/product_reviews.xsd">
  <version>2.3</version>
  <aggregator>
    <name><![CDATA[Golden Crafters]]></name>
  </aggregator>
  <publisher>
    <name><![CDATA[Golden Crafters]]></name>
  </publisher>
  <reviews>`;

            for (const r of reviews as any[]) {
                const p = r.product;
                if (!p) continue;
                const ts = new Date(r.createdAt).toISOString();
                xml += `
    <review>
      <review_id>${r.id}</review_id>
      <reviewer>
        <name><![CDATA[${r.reviewerName || 'Verified Buyer'}]]></name>
      </reviewer>
      <review_timestamp>${ts}</review_timestamp>
      <title><![CDATA[${r.title || p.title}]]></title>
      <content><![CDATA[${String(r.comment || '').replace(/<[^>]*>/g, '').substring(0, 5000)}]]></content>
      <review_url type="singleton">${SITE_URL}/p/${p.slug}</review_url>
      <ratings>
        <overall min="1" max="5">${r.rating}</overall>
      </ratings>
      <products>
        <product>
          <product_ids>
            <mpns><mpn>${escapeXml(p.sku || p.id)}</mpn></mpns>
            <skus><sku>${escapeXml(p.sku || p.id)}</sku></skus>
          </product_ids>
          <product_name><![CDATA[${p.title}]]></product_name>
          <product_url>${SITE_URL}/p/${p.slug}</product_url>
        </product>
      </products>
      <is_verified_order>${r.isVerifiedPurchase ? 'true' : 'false'}</is_verified_order>
      <is_anonymous>${r.userId ? 'false' : 'true'}</is_anonymous>
    </review>`;
            }

            xml += `
  </reviews>
</feed>`;

            res.set('Content-Type', 'application/xml; charset=utf-8');
            return res.send(xml);
        } catch (error) {
            console.error('Product Ratings Feed Error:', error);
            return res.status(500).json({ error: 'Failed to generate ratings feed' });
        }
    }

    /**
     * Product Share Data (OG Tags)
     */
    static async getProductShareData(req: Request, res: Response) {
        try {
            const { slug } = req.params;
            const product = await Product.findOne({ where: { slug } });

            if (!product) return res.status(404).json({ error: 'Product not found' });

            const imageUrl = product.images?.[0] || `${SITE_URL}/images/placeholder.jpg`;

            // Schema.org JSON-LD (aggregateRating/review yalnızca gerçek onaylı yorum varsa)
            let jsonLd: Record<string, unknown> | null = null;
            try {
                const { buildProductJsonLd } = await import('../utils/jsonLd');
                const { default: ProductReview } = await import('../models/ProductReview');
                const approved = await ProductReview.findAll({
                    where: { productId: product.id, isApproved: true },
                    order: [['createdAt', 'DESC']],
                    limit: 10,
                    attributes: ['reviewerName', 'rating', 'title', 'comment', 'createdAt']
                });
                const store = await Store.findByPk((product as any).storeId, { attributes: ['storeName'] }).catch(() => null);
                jsonLd = buildProductJsonLd(
                    {
                        title: product.title,
                        description: product.description,
                        slug: product.slug,
                        sku: product.sku,
                        images: product.images,
                        priceTRY: product.priceTRY,
                        quantity: product.quantity,
                        storeName: (store as any)?.storeName,
                        ratingAverage: (product as any).ratingAverage,
                        ratingCount: (product as any).ratingCount
                    },
                    approved.map((r: any) => ({
                        reviewerName: r.reviewerName,
                        rating: r.rating,
                        title: r.title,
                        comment: r.comment,
                        createdAt: r.createdAt
                    }))
                );
            } catch (e) {
                console.error('Share Data jsonLd warning:', e);
            }

            return res.json({
                title: product.title,
                description: product.description || `${product.title} - Golden Crafters`,
                url: `${SITE_URL}/p/${product.slug}`,
                image: imageUrl,
                price: product.priceTRY,
                currency: 'TRY',
                ratingAverage: Number((product as any).ratingAverage) || 0,
                ratingCount: (product as any).ratingCount || 0,
                jsonLd,
                og: {
                    'og:title': product.title,
                    'og:description': product.description || `${product.title} - Golden Crafters`,
                    'og:url': `${SITE_URL}/p/${product.slug}`,
                    'og:image': imageUrl,
                    'og:type': 'product',
                    'product:price:amount': product.priceTRY,
                    'product:price:currency': 'TRY'
                }
            });
        } catch (error) {
            console.error('Share Data Error:', error);
            return res.status(500).json({ error: 'Failed to get share data' });
        }
    }
}

export default FeedController;