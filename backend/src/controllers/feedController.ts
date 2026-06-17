import { Request, Response } from 'express';
import { Op } from 'sequelize';
import Product from '../models/Product';
import Store from '../models/Store';
import { GlobalSetting } from '../models/GlobalSetting';

const SITE_URL = process.env.SITE_URL || 'https://goldencrafters.com';
const LANGUAGES = ['en', 'tr', 'it', 'ar', 'es'];

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

            // Load global merchant settings
            const settings = await GlobalSetting.findAll({
                where: { key: { [Op.in]: ['merchant_center_id', 'merchant_target_country', 'merchant_target_language'] } }
            });
            const settingsMap: Record<string, string> = {};
            for (const s of settings) settingsMap[s.key] = s.value;

            const merchantId = settingsMap.merchant_center_id || '';
            const targetCountry = (settingsMap.merchant_target_country || 'TR').toUpperCase();

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
                    xml += `
    <g:availability>${availability}</g:availability>
    <g:condition>new</g:condition>
    <g:brand><![CDATA[${langStore}]]></g:brand>
    <g:mpn>${product.sku || product.id}</g:mpn>
    <g:product_type><![CDATA[${product.category || 'Jewelry'}]]></g:product_type>
    <g:google_product_category>188</g:google_product_category>
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
                mpn: product.sku || product.id
            }));

            return res.json({ data: catalog });
        } catch (error) {
            console.error('Facebook Feed Error:', error);
            return res.status(500).json({ error: 'Failed to generate feed' });
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

            return res.json({
                title: product.title,
                description: product.description || `${product.title} - Golden Crafters`,
                url: `${SITE_URL}/p/${product.slug}`,
                image: imageUrl,
                price: product.priceTRY,
                currency: 'TRY',
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