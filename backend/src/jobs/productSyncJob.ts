/**
 * productSyncJob.ts
 *
 * CREATE vs UPDATE logic:
 *  - No ProductMarketplaceListing record → product not yet listed → CREATE on marketplace
 *  - Record exists (active/pending) → product already listed → UPDATE price/stock only
 *  - Record exists (failed) → retry CREATE
 *
 * After successful creation:
 *  - Save external ID/code returned by the marketplace to ProductMarketplaceListing
 */

import Queue from 'bull';
import dotenv from 'dotenv';
import MarketplaceIntegration from '../models/MarketplaceIntegration';
import ProductMarketplaceListing from '../models/ProductMarketplaceListing';
import Product from '../models/Product';
import ProductVariant from '../models/ProductVariant';
import IntegrationLog from '../models/IntegrationLog';
import TrendyolClient, { TrendyolCreateProductItem, TrendyolPriceUpdateItem } from '../integrations/trendyol/trendyolClient';
import N11Client, { N11CreateProductItem } from '../integrations/n11/n11Client';
import HepsiburadaClient from '../integrations/hepsiburada/hepsiburadaClient';
import EtsyClient, { EtsyCreateListingPayload } from '../integrations/etsy/etsyClient';

dotenv.config();

export const productSyncQueue = process.env.REDIS_URL
    ? new Queue('product-sync', process.env.REDIS_URL)
    : new Queue('product-sync', {
        redis: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD
        }
    });

productSyncQueue.process(async (job) => {
    const { productId, userId, trigger } = job.data;
    console.log(`[ProductSync] Product ${productId} | Trigger: ${trigger}`);

    const product: any = await Product.findByPk(productId, {
        include: [{ model: ProductVariant, as: 'variants' }]
    });
    if (!product) {
        console.error(`[ProductSync] Product ${productId} not found`);
        return;
    }

    if (!userId) {
        console.error(`[ProductSync] No userId for job ${job.id}`);
        return;
    }

    const integrations = await MarketplaceIntegration.findAll({
        where: { userId, isActive: true }
    });

    if (integrations.length === 0) {
        console.log(`[ProductSync] No active integrations for user ${userId}`);
        return;
    }

    for (const integration of integrations) {
        // Only sync to platforms the product is listed on
        const productMarketplaces: string[] = product.marketplaces || [];
        if (!productMarketplaces.includes(integration.platform) && (integration.platform as string) !== 'golden') {
            continue;
        }

        console.log(`[ProductSync] Syncing to ${integration.platform}...`);
        try {
            switch (integration.platform) {
                case 'etsy':
                    await syncToEtsy(integration, product);
                    break;
                case 'trendyol':
                    await syncToTrendyol(integration, product, trigger);
                    break;
                case 'hepsiburada':
                    await syncToHepsiburada(integration, product);
                    break;
                case 'n11':
                    await syncToN11(integration, product, trigger);
                    break;
                default:
                    console.log(`[ProductSync] Platform ${integration.platform} not supported`);
            }
        } catch (err: any) {
            console.error(`[ProductSync] Failed to sync to ${integration.platform}:`, err.message);
            // Mark listing as failed if we have one
            await ProductMarketplaceListing.update(
                { status: 'failed', lastError: err.message },
                { where: { productId: product.id, platform: integration.platform as any } }
            );

            // LOG ERROR TO DB for User/Admin to see
            await IntegrationLog.create({
                userId: integration.userId,
                platform: integration.platform as string,
                endpoint: 'Sync Manager',
                requestMethod: 'SYNC',
                isSuccess: false,
                errorMessage: `Senkronizasyon Hatası (${integration.platform}): ${err.message}`
            });
        }
    }
});

// ─── Etsy ─────────────────────────────────────────────────────────────
async function syncToEtsy(integration: any, product: any) {
    if (!integration.accessToken || !integration.shopId) {
        console.warn('[Etsy] Missing accessToken or shopId. Skipping.');
        return;
    }

    // Check if already listed
    const existing = await ProductMarketplaceListing.findOne({
        where: { productId: product.id, platform: 'etsy' }
    });

    const shouldCreate = !existing || existing.status === 'failed';

    if (shouldCreate) {
        if (!integration.etsyCategoryId) {
            console.warn(`[Etsy] etsyCategoryId not set in integration settings. Cannot create product.`);
            await IntegrationLog.create({
                 userId: integration.userId,
                 platform: 'etsy',
                 endpoint: 'Pre-Sync Validation',
                 requestMethod: 'SYNC',
                 isSuccess: false,
                 errorMessage: `Ürün Gönderilemedi: Etsy Kategori ID eşleştirmesi eksik (SKU: ${product.sku})`
            });
            return;
        }

        const payload: EtsyCreateListingPayload = {
            quantity: product.quantity || 1,
            title: product.title.substring(0, 140), // Etsy title limit
            description: product.description || product.title,
            price: Number(product.priceUSD || product.priceTRY / 35), // Default fallback if no USD price
            who_made: 'i_did',
            when_made: 'made_to_order',
            taxonomy_id: integration.etsyCategoryId,
            is_supply: false,
            should_auto_renew: false
        };

        console.log(`[Etsy] Creating new draft listing: ${product.sku} - ${product.title}`);
        const result = await EtsyClient.createDraftListing(integration.shopId, integration.accessToken, payload);
        const listingId = result.listing_id || result.id;

        if (existing) {
            await existing.update({
                externalId: String(listingId),
                externalCode: String(listingId),
                status: 'pending',
                lastError: undefined
            });
        } else {
            await ProductMarketplaceListing.create({
                productId: product.id,
                platform: 'etsy',
                externalId: String(listingId),
                externalCode: String(listingId),
                status: 'pending'
            });
        }

        // Upload images
        if (Array.isArray(product.images) && product.images.length > 0) {
            for (const imageUrl of product.images) {
                try {
                    await EtsyClient.uploadListingImage(integration.shopId, listingId, integration.accessToken, imageUrl);
                } catch (imgError: any) {
                    console.warn(`[Etsy] Failed to upload image ${imageUrl} for listing ${listingId}:`, imgError.message);
                }
            }
        }

        // Publish
        try {
            await EtsyClient.updateListing(integration.shopId, listingId, integration.accessToken, { state: 'active' });
            
            // Mark as active
            await ProductMarketplaceListing.update(
                { status: 'active' },
                { where: { productId: product.id, platform: 'etsy' } }
            );
        } catch (publishErr: any) {
             console.warn(`[Etsy] Created but failed to publish listing ${listingId}:`, publishErr.message);
        }

        await IntegrationLog.create({
             userId: integration.userId,
             platform: 'etsy',
             endpoint: 'POST /v3/application/shops/{shop_id}/listings',
             requestMethod: 'SYNC',
             isSuccess: true,
             requestPayload: payload,
             responsePayload: result
        });
        console.log(`[Etsy] Product listing saved. ID: ${listingId}`);

    } else {
        // UPDATE existing product price/stock
        console.log(`[Etsy] Updating existing product (ID: ${existing.externalId})`);
        
        const updates = {
            price: Number(product.priceUSD || product.priceTRY / 35),
            quantity: product.quantity || 1
        };

        const result = await EtsyClient.updateListing(integration.shopId, Number(existing.externalId), integration.accessToken, updates);

        await IntegrationLog.create({
             userId: integration.userId,
             platform: 'etsy',
             endpoint: 'PUT /v3/application/shops/{shop_id}/listings/{listing_id}',
             requestMethod: 'SYNC',
             isSuccess: true,
             requestPayload: updates,
             responsePayload: result
        });

        await existing.update({ status: 'active' });
    }

    await integration.update({ lastSyncAt: new Date() });
}

// ─── Trendyol ──────────────────────────────────────────────────────────────
async function syncToTrendyol(integration: any, product: any, _trigger: string) {
    const { apiKey, apiSecret, shopId } = integration;
    if (!apiKey || !apiSecret || !shopId) {
        console.warn('[Trendyol] Missing credentials. Skipping.');
        return;
    }

    const client = new TrendyolClient(apiKey, apiSecret, shopId, integration.userId);
    const listPrice = Math.round(Number(product.priceTRY) * 1.1 * 100) / 100;
    const salePrice = Number(product.priceTRY);

    // Check if already listed
    const existing = await ProductMarketplaceListing.findOne({
        where: { productId: product.id, platform: 'trendyol' }
    });

    const shouldCreate = !existing || existing.status === 'failed';

    if (shouldCreate) {
        // Validate we have required fields for create
        if (!integration.trendyolCategoryId || !integration.trendyolBrandId) {
            console.warn(`[Trendyol] categoryId or brandId not set in integration settings. Cannot create product.`);
            await IntegrationLog.create({
                 userId: integration.userId,
                 platform: 'trendyol',
                 endpoint: 'Pre-Sync Validation',
                 requestMethod: 'SYNC',
                 isSuccess: false,
                 errorMessage: `Ürün Gönderilemedi: Kategori veya Marka ID eşleştirmesi eksik (SKU: ${product.sku})`
            });
            return;
        }

        const images = Array.isArray(product.images) && product.images.length > 0
            ? product.images.map((url: string) => ({ url }))
            : [{ url: 'https://asb.web.tr/product.jpg' }];

        const items: TrendyolCreateProductItem[] = [];

        if (product.hasVariants && product.variants && product.variants.length > 0) {
            for (const variant of product.variants) {
                const variantSku = variant.sku || `${product.sku}-${variant.id.split('-')[0]}`;
                const variantDesc = Object.entries(variant.attributes || {}).map(([k,v]) => `${k}: ${v}`).join(', ');
                
                items.push({
                    barcode: variantSku,
                    title: `${product.title} - ${variantDesc}`,
                    productMainId: product.sku,
                    stockCode: variantSku,
                    description: product.description || product.title,
                    categoryId: integration.trendyolCategoryId,
                    brandId: integration.trendyolBrandId,
                    listPrice: variant.priceTRY > 0 ? Math.round(Number(variant.priceTRY) * 1.1 * 100) / 100 : listPrice,
                    salePrice: variant.priceTRY > 0 ? Number(variant.priceTRY) : salePrice,
                    vatRate: integration.defaultVatRate || 10,
                    quantity: variant.quantity || 0,
                    images
                });
            }
        } else {
            items.push({
                barcode: product.sku,
                title: product.title,
                productMainId: product.sku,
                stockCode: product.sku,
                description: product.description || product.title,
                categoryId: integration.trendyolCategoryId,
                brandId: integration.trendyolBrandId,
                listPrice,
                salePrice,
                vatRate: integration.defaultVatRate || 10,
                quantity: product.quantity,
                images
            });
        }

        console.log(`[Trendyol] Creating new product(s): Main SKU ${product.sku} - ${product.title}`);
        const batchRequestId = await client.createProducts(items);

        // Save/update listing record
        if (existing) {
            await existing.update({
                externalCode: product.sku,
                batchRequestId,
                status: 'pending',
                lastError: undefined
            });
        } else {
            await ProductMarketplaceListing.create({
                productId: product.id,
                platform: 'trendyol',
                externalCode: product.sku,
                externalId: batchRequestId || product.sku,
                batchRequestId,
                status: 'pending'
            });
        }
        console.log(`[Trendyol] Product listing saved. Batch: ${batchRequestId}`);

        await IntegrationLog.create({
             userId: integration.userId,
             platform: 'trendyol',
             endpoint: 'Create Products API',
             requestMethod: 'SYNC',
             isSuccess: true,
             requestPayload: items,
             responsePayload: { batchRequestId }
        });

    } else {
        // UPDATE existing product price/stock
        console.log(`[Trendyol] Updating existing product (barcode: ${existing.externalCode})`);
        const updateItems: TrendyolPriceUpdateItem[] = [];
        
        if (product.hasVariants && product.variants && product.variants.length > 0) {
            for (const variant of product.variants) {
                 const variantSku = variant.sku || `${product.sku}-${variant.id.split('-')[0]}`;
                 updateItems.push({
                     barcode: variantSku,
                     listPrice: variant.priceTRY > 0 ? Math.round(Number(variant.priceTRY) * 1.1 * 100) / 100 : listPrice,
                     salePrice: variant.priceTRY > 0 ? Number(variant.priceTRY) : salePrice,
                     quantity: variant.quantity || 0
                 });
            }
        } else {
            updateItems.push({
                barcode: existing.externalCode,
                listPrice,
                salePrice,
                quantity: product.quantity
            });
        }

        await client.updatePrices(updateItems);
        await existing.update({ status: 'active' });

        await IntegrationLog.create({
             userId: integration.userId,
             platform: 'trendyol',
             endpoint: 'Update Prices API',
             requestMethod: 'SYNC',
             isSuccess: true,
             requestPayload: updateItems,
             responsePayload: { status: 'success' }
        });
    }

    await integration.update({ lastSyncAt: new Date() });
}

// ─── Hepsiburada ─────────────────────────────────────────────────────────────
async function syncToHepsiburada(integration: any, product: any) {
    const { username, password, shopId } = integration; // Hepsiburada uses username/password normally
    if (!username || !password || !shopId) return;

    const client = new HepsiburadaClient(username, password, shopId, integration.userId);
    const updateItems: any[] = [];

    if (product.hasVariants && product.variants && product.variants.length > 0) {
        for (const variant of product.variants) {
            const variantSku = variant.sku || `${product.sku}-${variant.id.split('-')[0]}`;
            updateItems.push({
                sku: variantSku,
                price: Number(variant.priceTRY > 0 ? variant.priceTRY : product.priceTRY),
                stock: variant.quantity || 0
            });
        }
    } else {
        updateItems.push({
            sku: product.sku,
            price: Number(product.priceTRY),
            stock: product.quantity
        });
    }

    await client.updatePrices(updateItems);
    await integration.update({ lastSyncAt: new Date() });
}

// ─── N11 ──────────────────────────────────────────────────────────────────────
async function syncToN11(integration: any, product: any, _trigger: string) {
    const { apiKey, apiSecret } = integration;
    if (!apiKey || !apiSecret) {
        console.warn('[N11] Missing credentials. Skipping.');
        return;
    }

    const client = new N11Client(apiKey, apiSecret, integration.userId);

    // Check if already listed
    const existing = await ProductMarketplaceListing.findOne({
        where: { productId: product.id, platform: 'n11' }
    });

    const shouldCreate = !existing || existing.status === 'failed';

    if (shouldCreate) {
        if (!integration.n11CategoryId) {
            console.warn(`[N11] n11CategoryId not set in integration settings. Cannot create product.`);
            await IntegrationLog.create({
                 userId: integration.userId,
                 platform: 'n11',
                 endpoint: 'Pre-Sync Validation',
                 requestMethod: 'SYNC',
                 isSuccess: false,
                 errorMessage: `Ürün Gönderilemedi: N11 Kategori ID eşleştirmesi eksik (SKU: ${product.sku})`
            });
            return;
        }

        const item: N11CreateProductItem = {
            title: product.title,
            stockCode: product.sku,
            description: product.description || product.title,
            categoryId: integration.n11CategoryId,
            price: Number(product.priceTRY),
            quantity: product.quantity,
            images: Array.isArray(product.images) ? product.images : [],
            vatRate: integration.defaultVatRate || 10
        };

        console.log(`[N11] Creating new product: ${product.sku} - ${product.title}`);
        const n11ProductId = await client.createProduct(item);

        if (existing) {
            await existing.update({
                externalId: n11ProductId,
                externalCode: n11ProductId,
                status: 'active',
                lastError: undefined
            });
        } else {
            await ProductMarketplaceListing.create({
                productId: product.id,
                platform: 'n11',
                externalId: n11ProductId,
                externalCode: n11ProductId,
                status: 'active'
            });
        }
        console.log(`[N11] Product listing saved. ID: ${n11ProductId}`);

        await IntegrationLog.create({
             userId: integration.userId,
             platform: 'n11',
             endpoint: 'Create Product API',
             requestMethod: 'SYNC',
             isSuccess: true,
             requestPayload: item,
             responsePayload: { n11ProductId }
        });

    } else {
        // UPDATE price/stock
        console.log(`[N11] Updating existing product (ID: ${existing.externalId})`);
        const updateItems: any[] = [];
        
        if (product.hasVariants && product.variants && product.variants.length > 0) {
            for (const variant of product.variants) {
                 const variantSku = variant.sku || `${product.sku}-${variant.id.split('-')[0]}`;
                 updateItems.push({
                     productId: existing.externalId || existing.externalCode,
                     sku: variantSku,
                     price: Number(variant.priceTRY > 0 ? variant.priceTRY : product.priceTRY),
                     stock: variant.quantity || 0
                 });
            }
        } else {
            updateItems.push({
                productId: existing.externalId || existing.externalCode,
                sku: existing.externalCode,
                price: Number(product.priceTRY),
                stock: product.quantity
            });
        }

        await client.updatePrices(updateItems);
        await existing.update({ status: 'active' });

        await IntegrationLog.create({
             userId: integration.userId,
             platform: 'n11',
             endpoint: 'Update Prices API',
             requestMethod: 'SYNC',
             isSuccess: true,
             requestPayload: updateItems,
             responsePayload: { status: 'success' }
        });
    }

    await integration.update({ lastSyncAt: new Date() });
}

export default productSyncQueue;
