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
import TrendyolClient, { TrendyolCreateProductItem } from '../integrations/trendyol/trendyolClient';
import N11Client, { N11CreateProductItem } from '../integrations/n11/n11Client';
import HepsiburadaClient from '../integrations/hepsiburada/hepsiburadaClient';

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

    const product = await Product.findByPk(productId);
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
        }
    }
});

// ─── Mock Etsy ─────────────────────────────────────────────────────────────
async function syncToEtsy(integration: any, product: any) {
    console.log(`[Etsy] Mock sync for "${product.title}"`);
    await integration.update({ lastSyncAt: new Date() });
}

// ─── Trendyol ──────────────────────────────────────────────────────────────
async function syncToTrendyol(integration: any, product: any, _trigger: string) {
    const { apiKey, apiSecret, shopId } = integration;
    if (!apiKey || !apiSecret || !shopId) {
        console.warn('[Trendyol] Missing credentials. Skipping.');
        return;
    }

    const client = new TrendyolClient(apiKey, apiSecret, shopId);
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
            console.warn(`[Trendyol] Please set trendyolCategoryId and trendyolBrandId in integration settings.`);
            return;
        }

        const images = Array.isArray(product.images) && product.images.length > 0
            ? product.images.map((url: string) => ({ url }))
            : [{ url: 'https://asb.web.tr/product.jpg' }];

        const item: TrendyolCreateProductItem = {
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
        };

        console.log(`[Trendyol] Creating new product: ${product.sku} - ${product.title}`);
        const batchRequestId = await client.createProducts([item]);

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

    } else {
        // UPDATE existing product price/stock
        console.log(`[Trendyol] Updating existing product (barcode: ${existing.externalCode})`);
        await client.updatePrices([{
            barcode: existing.externalCode,
            listPrice,
            salePrice,
            quantity: product.quantity
        }]);
        await existing.update({ status: 'active' });
    }

    await integration.update({ lastSyncAt: new Date() });
}

// ─── Hepsiburada ─────────────────────────────────────────────────────────────
async function syncToHepsiburada(integration: any, product: any) {
    const { apiKey, apiSecret, shopId } = integration;
    if (!apiKey || !apiSecret || !shopId) return;

    const client = new HepsiburadaClient(apiKey, apiSecret, shopId);
    await client.updatePrices([{
        sku: product.sku,
        price: Number(product.priceTRY),
        stock: product.quantity
    }]);
    await integration.update({ lastSyncAt: new Date() });
}

// ─── N11 ──────────────────────────────────────────────────────────────────────
async function syncToN11(integration: any, product: any, _trigger: string) {
    const { apiKey, apiSecret } = integration;
    if (!apiKey || !apiSecret) {
        console.warn('[N11] Missing credentials. Skipping.');
        return;
    }

    const client = new N11Client(apiKey, apiSecret);

    // Check if already listed
    const existing = await ProductMarketplaceListing.findOne({
        where: { productId: product.id, platform: 'n11' }
    });

    const shouldCreate = !existing || existing.status === 'failed';

    if (shouldCreate) {
        if (!integration.n11CategoryId) {
            console.warn(`[N11] n11CategoryId not set in integration settings. Cannot create product.`);
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

    } else {
        // UPDATE price/stock
        console.log(`[N11] Updating existing product (ID: ${existing.externalId})`);
        await client.updatePrices([{
            productId: existing.externalId || existing.externalCode,
            price: Number(product.priceTRY),
            stock: product.quantity
        }]);
        await existing.update({ status: 'active' });
    }

    await integration.update({ lastSyncAt: new Date() });
}

export default productSyncQueue;
