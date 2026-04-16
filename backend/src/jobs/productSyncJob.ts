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
import PazaramaClient, { PazaramaPriceUpdateItem, PazaramaStockUpdateItem, PazaramaProductCreateInput } from '../integrations/pazarama/pazaramaClient';

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
                case 'pazarama':
                    await syncToPazarama(integration, product);
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
        // Try to get IDs from product level first, then fallback to integration settings
        const productShippingProfileId = product.marketplaceConfig?.etsy?.shippingProfileId;
        const shippingProfileId = productShippingProfileId || integration.etsyShippingProfileId;

        const returnPolicyId = product.marketplaceConfig?.etsy?.returnPolicyId;
        const readinessStateId = product.marketplaceConfig?.etsy?.readinessStateId;
        
        const productCategoryId = product.marketplaceConfig?.etsy?.categoryId;
        const categoryId = productCategoryId || integration.etsyCategoryId;

        if (!categoryId || !shippingProfileId || !returnPolicyId || !readinessStateId) {
            console.warn(`[Etsy] Missing configuration (categoryId, shippingProfile, returnPolicy, or readinessState). Cannot create product.`);
            await IntegrationLog.create({
                 userId: integration.userId,
                 platform: 'etsy',
                 endpoint: 'Pre-Sync Validation',
                 requestMethod: 'SYNC',
                 isSuccess: false,
                 errorMessage: `Ürün Gönderilemedi: Etsy Kategori, Kargo Profili, İade Politikası veya Hazırlık Süresi (Readiness) seçilmemiş (SKU: ${product.sku}). Lütfen ürünü düzenleyip Etsy ayarlarını eksiksiz doldurun.`
            });
            return;
        }

        let etsyTags = undefined;
        if (Array.isArray(product.tags) && product.tags.length > 0) {
            etsyTags = product.tags.map((t: string) => String(t).substring(0, 20)).slice(0, 13);
        }

        const payload: EtsyCreateListingPayload = {
            quantity: product.quantity || 1,
            title: product.title.substring(0, 140), // Etsy title limit
            description: product.description || product.title,
            price: Number(product.priceUSD || product.priceTRY / 35), // Default fallback if no USD price
            who_made: 'i_did',
            when_made: 'made_to_order',
            taxonomy_id: categoryId,
            shipping_profile_id: shippingProfileId,
            return_policy_id: returnPolicyId,
            readiness_state_id: readinessStateId,
            is_supply: false,
            should_auto_renew: false,
            tags: etsyTags
        };

        console.log(`[Etsy] Creating new draft listing: ${product.sku} - ${product.title}`);
        const client = new EtsyClient(integration);
        const result = await client.createDraftListing(integration.shopId, integration.accessToken, payload);
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
                    await client.uploadListingImage(integration.shopId, listingId, integration.accessToken, imageUrl);
                } catch (imgError: any) {
                    console.warn(`[Etsy] Failed to upload image ${imageUrl} for listing ${listingId}:`, imgError.message);
                }
            }
        }

        // Push variants to inventory if there are any
        if (product.hasVariants && Array.isArray(product.variants) && product.variants.length > 0) {
             try {
                 const propertyNames = Object.keys(product.variants[0].attributes || {});
                 if (propertyNames.length > 0) {
                     const propMap: Record<string, number> = {};
                     propertyNames.forEach((name, idx) => {
                         if (idx < 2) propMap[name] = 513 + idx; // Max 2 properties
                     });

                     const productsList = product.variants.map((v: any) => {
                         const property_values = Object.keys(v.attributes).map((name, idx) => {
                             if (idx >= 2) return null;
                             return {
                                 property_id: propMap[name],
                                 property_name: name,
                                 values: [v.attributes[name]]
                             };
                         }).filter(Boolean);

                         return {
                             sku: v.sku,
                             property_values,
                             offerings: [{
                                 price: Number(v.priceUSD) || Number(v.priceTRY) / 35,
                                 quantity: v.quantity || 0,
                                 is_enabled: true,
                                 readiness_state_id: readinessStateId || 1
                             }]
                         };
                     });

                     const inventoryPayload: any = {
                         products: productsList,
                         price_on_property: [513],
                         quantity_on_property: [513],
                         sku_on_property: [513],
                         readiness_state_on_property: [513]
                     };

                     if (propMap[propertyNames[1]]) {
                         inventoryPayload.price_on_property.push(514);
                         inventoryPayload.quantity_on_property.push(514);
                         inventoryPayload.sku_on_property.push(514);
                         inventoryPayload.readiness_state_on_property.push(514);
                     }

                     await client.updateListingInventory(listingId, integration.accessToken, inventoryPayload);
                     console.log(`[Etsy] Pushed variants as inventory to listing ${listingId}`);
                 }
             } catch (invErr: any) {
                 console.warn(`[Etsy] Failed to push variants to listing ${listingId}:`, invErr.message);
                 await IntegrationLog.create({
                     userId: integration.userId,
                     platform: 'etsy',
                     endpoint: 'PUT /v3/application/listings/{listing_id}/inventory',
                     requestMethod: 'SYNC',
                     isSuccess: false,
                     errorMessage: `Varyasyonlar Etsy'ye aktarılamadı: ` + invErr.message
                 });
             }
        }

        // Publish
        try {
            await client.updateListing(integration.shopId, listingId, integration.accessToken, { state: 'active' });
            
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
        const client = new EtsyClient(integration);
        console.log(`[Etsy] Updating existing product (ID: ${existing.externalId})`);
        
        const updates = {
            price: Number(product.priceUSD || product.priceTRY / 35),
            quantity: product.quantity || 1
        };

        const result = await client.updateListing(integration.shopId, Number(existing.externalId), integration.accessToken, updates);

        await IntegrationLog.create({
             userId: integration.userId,
             platform: 'etsy',
             endpoint: 'PATCH /v3/application/shops/{shop_id}/listings/{listing_id}',
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
        // Check product-level config first, then fall back to integration defaults
        const productTrendyolCategoryId = product.marketplaceConfig?.trendyol?.categoryId;
        const productTrendyolBrandId = product.marketplaceConfig?.trendyol?.brandId;
        const categoryId = productTrendyolCategoryId || integration.trendyolCategoryId;
        const brandId = productTrendyolBrandId || integration.trendyolBrandId;

        if (!categoryId || !brandId) {
            console.warn(`[Trendyol] categoryId or brandId not set. Cannot create product.`);
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
                    categoryId,
                    brandId,
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
                categoryId,
                brandId,
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
        // Check product-level config first, then fall back to integration defaults
        const productN11CategoryId = product.marketplaceConfig?.n11?.categoryId;
        const categoryId = productN11CategoryId || integration.n11CategoryId;

        if (!categoryId) {
            console.warn(`[N11] n11CategoryId not set. Cannot create product.`);
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
            categoryId,
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

// ─── Pazarama ─────────────────────────────────────────────────────────────
async function syncToPazarama(integration: any, product: any) {
    const { apiKey, apiSecret, shopId } = integration;
    if (!apiKey || !apiSecret || !shopId) {
        console.warn('[Pazarama] Missing credentials. Skipping.');
        return;
    }

    const client = new PazaramaClient(apiKey, apiSecret, integration.userId);

    // Check if already listed
    const existing = await ProductMarketplaceListing.findOne({
        where: { productId: product.id, platform: 'pazarama' }
    });

    const shouldCreate = !existing || existing.status === 'failed';

    if (shouldCreate) {
        // Check product-level config first, then fall back to integration defaults
        const productPazaramaCategoryId = product.marketplaceConfig?.pazarama?.categoryId;
        const productPazaramaBrandId = product.marketplaceConfig?.pazarama?.brandId;
        const categoryId = productPazaramaCategoryId || integration.pazaramaCategoryId;
        const brandId = productPazaramaBrandId || integration.pazaramaBrandId;

        if (!categoryId || !brandId) {
            console.warn(`[Pazarama] categoryId or brandId not set. Cannot create product.`);
            await IntegrationLog.create({
                 userId: integration.userId,
                 platform: 'pazarama',
                 endpoint: 'Pre-Sync Validation',
                 requestMethod: 'SYNC',
                 isSuccess: false,
                 errorMessage: `Ürün Gönderilemedi: Pazarama Kategori veya Marka ID eksik (SKU: ${product.sku})`
            });
            return;
        }

        const images = Array.isArray(product.images) && product.images.length > 0
            ? product.images
            : ['https://asb.web.tr/product.jpg'];

        const item: PazaramaProductCreateInput = {
            name: product.title,
            description: product.description || product.title,
            brandId,
            categoryId,
            stockCode: product.sku,
            stockCount: product.quantity || 1,
            salePrice: Number(product.priceTRY),
            listPrice: Math.round(Number(product.priceTRY) * 1.1 * 100) / 100,
            vatRate: integration.defaultVatRate || 10,
            images,
            attributes: {
                Milyem: String(product.milyem || ''),
                Gram: String(product.gramWeight || '')
            }
        };

        console.log(`[Pazarama] Creating new product: ${product.sku} - ${product.title}`);
        const pazaramaProductId = await client.createProduct(item);

        if (existing) {
            await existing.update({
                externalId: pazaramaProductId,
                externalCode: product.sku,
                status: 'active',
                lastError: undefined
            });
        } else {
            await ProductMarketplaceListing.create({
                productId: product.id,
                platform: 'pazarama',
                externalId: pazaramaProductId,
                externalCode: product.sku,
                status: 'active'
            });
        }
        console.log(`[Pazarama] Product listing saved. ID: ${pazaramaProductId}`);

        await IntegrationLog.create({
             userId: integration.userId,
             platform: 'pazarama',
             endpoint: 'Create Product API',
             requestMethod: 'SYNC',
             isSuccess: true,
             requestPayload: item,
             responsePayload: { productId: pazaramaProductId }
        });

    } else {
        // UPDATE price/stock
        console.log(`[Pazarama] Updating existing product (ID: ${existing.externalCode})`);

        const updatePriceItems: PazaramaPriceUpdateItem[] = [];
        const updateStockItems: PazaramaStockUpdateItem[] = [];

        if (product.hasVariants && product.variants && product.variants.length > 0) {
            for (const variant of product.variants) {
                const variantSku = variant.sku || `${product.sku}-${variant.id.split('-')[0]}`;
                updatePriceItems.push({
                    code: variantSku,
                    listPrice: Number(variant.priceTRY > 0 ? variant.priceTRY : product.priceTRY),
                    salePrice: Number(variant.priceTRY > 0 ? variant.priceTRY : product.priceTRY)
                });
                updateStockItems.push({
                    code: variantSku,
                    stockCount: variant.quantity || 0
                });
            }
        } else {
            updatePriceItems.push({
                code: existing.externalCode,
                listPrice: Math.round(Number(product.priceTRY) * 1.1 * 100) / 100,
                salePrice: Number(product.priceTRY)
            });
            updateStockItems.push({
                code: existing.externalCode,
                stockCount: product.quantity || 0
            });
        }

        await client.updatePrices(updatePriceItems);
        await client.updateStock(updateStockItems);
        await existing.update({ status: 'active' });

        await IntegrationLog.create({
             userId: integration.userId,
             platform: 'pazarama',
             endpoint: 'Update Price/Stock API',
             requestMethod: 'SYNC',
             isSuccess: true,
             requestPayload: { prices: updatePriceItems, stocks: updateStockItems },
             responsePayload: { status: 'success' }
        });
    }

    await integration.update({ lastSyncAt: new Date() });
}

export default productSyncQueue;
