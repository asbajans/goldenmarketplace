/**
 * Feed Controller
 * Generate Google Shopping XML Feed & Social Sharing helpers
 */

import { Request, Response } from 'express';
import Product from '../models/Product';

import Store from '../models/Store';

export class FeedController {
    /**
     * Google Shopping XML Feed
     * Endpoint: GET /api/feed/google/:storeSlug.xml
     */
    static async googleShoppingFeed(req: Request, res: Response) {
        try {
            const { storeSlug } = req.params;
            let whereClause: any = { isActive: true };
            let storeName = 'Golden Marketplace';
            
            if (storeSlug) {
                const store = await Store.findOne({ where: { storeSlug, isActive: true } });
                if (!store) {
                    return res.status(404).send('Store not found');
                }
                whereClause.storeId = store.id;
                storeName = store.storeName;
            }

            const products = await Product.findAll({
                where: whereClause,
                limit: 1000
            });

            const siteUrl = process.env.SITE_URL || 'https://asb.web.tr';

            let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
<channel>
  <title>Golden Marketplace</title>
  <link>${siteUrl}</link>
  <description>Altın endeksli premium mücevher pazaryeri</description>`;

            for (const product of products) {
                const productUrl = `${siteUrl}/products/${product.slug}`;
                const imageUrl = product.images && product.images.length > 0
                    ? product.images[0]
                    : `${siteUrl}/images/placeholder.jpg`;

                xml += `
  <item>
    <g:id>${product.id}</g:id>
    <g:title><![CDATA[${product.title}]]></g:title>
    <g:description><![CDATA[${product.description || ''}]]></g:description>
    <g:link>${productUrl}</g:link>
    <g:image_link>${imageUrl}</g:image_link>
    <g:price>${product.priceTRY} TRY</g:price>
    <g:availability>${product.quantity > 0 ? 'in_stock' : 'out_of_stock'}</g:availability>
    <g:condition>new</g:condition>
    <g:brand><![CDATA[${storeName}]]></g:brand>
    <g:product_type><![CDATA[${product.category || 'Mücevher'}]]></g:product_type>
    <g:google_product_category>188</g:google_product_category>
    <g:identifier_exists>false</g:identifier_exists>
  </item>`;
            }

            xml += `
</channel>
</rss>`;

            res.set('Content-Type', 'application/xml');
            return res.send(xml);
        } catch (error) {
            console.error('Google Feed Error:', error);
            return res.status(500).json({ error: 'Failed to generate feed' });
        }
    }

    /**
     * Facebook Product Catalog Feed (JSON/XML)
     * Endpoint: GET /api/feed/facebook/:storeSlug.json
     * (Also covers /instagram/:storeSlug.json)
     */
    static async facebookCatalogFeed(req: Request, res: Response) {
        try {
            const { storeSlug } = req.params;
            let whereClause: any = { isActive: true };
            let storeName = 'Golden Marketplace';
            
            if (storeSlug) {
                const store = await Store.findOne({ where: { storeSlug, isActive: true } });
                if (!store) {
                    return res.status(404).json({ error: 'Store not found' });
                }
                whereClause.storeId = store.id;
                storeName = store.storeName;
            }

            const products = await Product.findAll({
                where: whereClause,
                limit: 1000
            });

            const siteUrl = process.env.SITE_URL || 'https://asb.web.tr';

            const catalog = products.map(product => ({
                id: product.id,
                title: product.title,
                description: product.description || '',
                availability: product.quantity > 0 ? 'in stock' : 'out of stock',
                condition: 'new',
                price: `${product.priceTRY} TRY`,
                link: `${siteUrl}/products/${product.slug}`,
                image_link: product.images && product.images.length > 0
                    ? product.images[0]
                    : `${siteUrl}/images/placeholder.jpg`,
                brand: storeName,
                google_product_category: '188'
            }));

            return res.json(catalog);
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

            if (!product) {
                return res.status(404).json({ error: 'Product not found' });
            }

            const siteUrl = process.env.SITE_URL || 'https://golden-marketplace.com';
            const imageUrl = product.images && product.images.length > 0
                ? product.images[0]
                : `${siteUrl}/images/placeholder.jpg`;

            return res.json({
                title: product.title,
                description: product.description || `${product.title} - Golden Marketplace'te`,
                url: `${siteUrl}/products/${product.slug}`,
                image: imageUrl,
                price: product.priceTRY,
                currency: 'TRY',
                og: {
                    'og:title': product.title,
                    'og:description': product.description || `${product.title} - Golden Marketplace'te`,
                    'og:url': `${siteUrl}/products/${product.slug}`,
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
