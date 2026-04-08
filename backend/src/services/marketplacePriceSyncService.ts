/**
 * MarketplacePriceSyncService
 *
 * Called when gold price changes (manual admin update).
 * ONLY updates prices for products that are ALREADY LISTED on the marketplace
 * (i.e., have a ProductMarketplaceListing record with status='active').
 *
 * Product CREATION is handled by productSyncJob.ts when a product is first added.
 */

import MarketplaceIntegration from '../models/MarketplaceIntegration';
import ProductMarketplaceListing from '../models/ProductMarketplaceListing';
import Product from '../models/Product';
import ProductVariant from '../models/ProductVariant';
import Store from '../models/Store';
import IntegrationLog from '../models/IntegrationLog';
import TrendyolClient from '../integrations/trendyol/trendyolClient';
import HepsiburadaClient, { HepsiburadaProduct } from '../integrations/hepsiburada/hepsiburadaClient';
import N11Client from '../integrations/n11/n11Client';
import PazaramaClient from '../integrations/pazarama/pazaramaClient';
import EtsyClient from '../integrations/etsy/etsyClient';

class MarketplacePriceSyncService {

    async syncAll(): Promise<{ synced: number; failed: number; errors: string[] }> {
        const stats = { synced: 0, failed: 0, errors: [] as string[] };
        console.log('[MarketplaceSync] Starting price sync...');

        try {
            const integrations = await MarketplaceIntegration.findAll({ where: { isActive: true } });
            if (!integrations.length) {
                console.log('[MarketplaceSync] No active integrations. Skipping.');
                return stats;
            }

            const byUser: Record<string, typeof integrations> = {};
            for (const integration of integrations) {
                if (!byUser[integration.userId]) byUser[integration.userId] = [];
                byUser[integration.userId].push(integration);
            }

            for (const [userId, userIntegrations] of Object.entries(byUser)) {
                const store = await Store.findOne({ where: { userId } });
                if (!store) continue;

                const products = await Product.findAll({ 
                    where: { storeId: store.id, isActive: true },
                    include: [{ model: ProductVariant, as: 'variants' }]
                });
                if (!products.length) continue;

                for (const integration of userIntegrations) {
                    try {
                        await this.syncForPlatform(integration, products);
                        stats.synced++;
                        await integration.update({ lastSyncAt: new Date(), lastSyncStatus: 'success', lastSyncMessage: null });
                    } catch (err: any) {
                        stats.failed++;
                        const errMsg = `[${integration.platform}] uid=${userId}: ${err.message}`;
                        stats.errors.push(errMsg);
                        console.error('[MarketplaceSync]', errMsg);
                        await integration.update({ lastSyncAt: new Date(), lastSyncStatus: 'error', lastSyncMessage: err.message });
                    }
                }
            }
        } catch (err: any) {
            console.error('[MarketplaceSync] Fatal error:', err.message);
        }

        console.log(`[MarketplaceSync] Done. Synced: ${stats.synced}, Failed: ${stats.failed}`);
        return stats;
    }

    /**
     * Sync marketplace prices for a specific user (called from seller panel manual sync)
     */
    async syncUser(userId: string): Promise<{ synced: number; failed: number; errors: string[] }> {
        const stats = { synced: 0, failed: 0, errors: [] as string[] };
        console.log(`[MarketplaceSync] Starting price sync for user ${userId}...`);

        try {
            const store = await Store.findOne({ where: { userId } });
            if (!store) {
                console.log(`[MarketplaceSync] User ${userId} has no store. Skipping.`);
                return stats;
            }

            const products = await Product.findAll({ 
                where: { storeId: store.id, isActive: true },
                include: [{ model: ProductVariant, as: 'variants' }]
            });
            if (!products.length) {
                console.log(`[MarketplaceSync] User ${userId} has no active products. Skipping.`);
                return stats;
            }

            const integrations = await MarketplaceIntegration.findAll({ where: { userId, isActive: true } });
            if (!integrations.length) {
                console.log(`[MarketplaceSync] User ${userId} has no active integrations. Skipping.`);
                return stats;
            }

            for (const integration of integrations) {
                try {
                    await this.syncForPlatform(integration, products);
                    stats.synced++;
                    await integration.update({ lastSyncAt: new Date(), lastSyncStatus: 'success', lastSyncMessage: null });
                } catch (err: any) {
                    stats.failed++;
                    const errMsg = `[${integration.platform}] uid=${userId}: ${err.message}`;
                    stats.errors.push(errMsg);
                    console.error('[MarketplaceSync]', errMsg);
                    await integration.update({ lastSyncAt: new Date(), lastSyncStatus: 'error', lastSyncMessage: err.message });
                }
            }
        } catch (err: any) {
            console.error('[MarketplaceSync] Fatal error:', err.message);
        }

        console.log(`[MarketplaceSync] Done for user ${userId}. Synced: ${stats.synced}, Failed: ${stats.failed}`);
        return stats;
    }

    async syncForPlatform(integration: MarketplaceIntegration, products: Product[]): Promise<void> {
        const { platform } = integration;

        switch (platform) {
            case 'trendyol':
                await this.syncTrendyol(integration, products);
                break;
            case 'hepsiburada':
                await this.syncHepsiburada(integration, products);
                break;
            case 'n11':
                await this.syncN11(integration, products);
                break;
            case 'pazarama':
                await this.syncPazarama(integration, products);
                break;
            case 'etsy':
                await this.syncEtsy(integration, products);
                break;
            case 'amazon':
                console.log(`[${platform}] Price sync skipped (handled separately)`);
                break;
            default:
                console.warn(`[MarketplaceSync] Unknown platform: ${platform}`);
        }
    }

    /**
     * Trendyol: only update products with active listings (known barcode)
     */
    private async syncTrendyol(integration: MarketplaceIntegration, products: Product[]): Promise<void> {
        const { apiKey, apiSecret, shopId } = integration;
        if (!apiKey || !apiSecret || !shopId) return;

        const client = new TrendyolClient(apiKey, apiSecret, shopId, integration.userId);
        const items = [];

        for (const product of products) {
            const listing = await ProductMarketplaceListing.findOne({
                where: { productId: product.id, platform: 'trendyol', status: 'active' }
            });
            if (!listing) {
                // Product not yet listed — skip price update (productSyncJob handles create)
                continue;
            }
            items.push({
                barcode: listing.externalCode,
                listPrice: Math.round(Number(product.priceTRY) * 1.1 * 100) / 100,
                salePrice: Number(product.priceTRY),
                quantity: product.quantity
            });
        }

        if (items.length > 0) {
            await client.updatePrices(items);
            console.log(`[Trendyol] Price sync: updated ${items.length} products.`);
        } else {
            console.log(`[Trendyol] No active listings to update. Create products via seller panel first.`);
        }
    }

    /**
     * Hepsiburada: update prices for all active products (uses SKU directly)
     */
    private async syncHepsiburada(integration: MarketplaceIntegration, products: Product[]): Promise<void> {
        const { apiKey: username, apiSecret: password, shopId: merchantId, userId } = integration;
        if (!username || !password || !merchantId) return;

        const client = new HepsiburadaClient(username, password, merchantId, userId);
        const items: HepsiburadaProduct[] = products.map(p => ({
            sku: p.sku,
            price: Number(p.priceTRY),
            stock: p.quantity
        }));
        if (items.length > 0) {
            await client.updatePrices(items);
        }
    }

    /**
     * N11: only update products with active listings (known N11 product ID)
     */
    private async syncN11(integration: MarketplaceIntegration, products: Product[]): Promise<void> {
        const { apiKey, apiSecret } = integration;
        if (!apiKey || !apiSecret) return;

        const client = new N11Client(apiKey, apiSecret, integration.userId);
        const items = [];

        for (const product of products) {
            const listing = await ProductMarketplaceListing.findOne({
                where: { productId: product.id, platform: 'n11', status: 'active' }
            });
            if (!listing) {
                continue;
            }
            items.push({
                productId: listing.externalId || listing.externalCode,
                price: Number(product.priceTRY),
                stock: product.quantity
            });
        }

        if (items.length > 0) {
            await client.updatePrices(items);
            console.log(`[N11] Price sync: updated ${items.length} products.`);
        } else {
            console.log(`[N11] No active listings to update.`);
        }
    }

    /**
     * Pazarama: update prices for all active products (uses external code / barcode)
     */
    private async syncPazarama(integration: MarketplaceIntegration, products: Product[]): Promise<void> {
        const { apiKey, apiSecret } = integration;
        if (!apiKey || !apiSecret) return;

        const client = new PazaramaClient(apiKey, apiSecret, integration.userId);
        const items = [];

        for (const product of products) {
            const listing = await ProductMarketplaceListing.findOne({
                where: { productId: product.id, platform: 'pazarama', status: 'active' }
            });
            if (!listing) {
                continue;
            }
            items.push({
                code: listing.externalCode || product.sku,
                listPrice: Math.round(Number(product.priceTRY) * 1.1 * 100) / 100,
                salePrice: Number(product.priceTRY)
            });
        }

        if (items.length > 0) {
            await client.updatePrices(items);
            console.log(`[Pazarama] Price sync: updated ${items.length} products.`);
        } else {
            console.log(`[Pazarama] No active listings to update.`);
        }
    }

    /**
     * Etsy: only update products with active listings (known listing ID)
     */
    private async syncEtsy(integration: MarketplaceIntegration, products: Product[]): Promise<void> {
        if (!integration.accessToken || !integration.shopId) {
            console.log('[Etsy] Missing accessToken or shopId. Skipping.');
            return;
        }

        const items = [];

        for (const product of products) {
            const listing = await ProductMarketplaceListing.findOne({
                where: { productId: product.id, platform: 'etsy', status: 'active' }
            });
            if (!listing) {
                // Product not yet listed — skip price update (productSyncJob handles create)
                continue;
            }

            // Etsy requires USD pricing
            const priceUSD = Number(product.priceUSD) || Number(product.priceTRY) / 35;
            
            items.push({
                listingId: Number(listing.externalId),
                price: priceUSD,
                quantity: product.quantity,
                productSku: product.sku,
                variants: (product as any).variants || []
            });
        }

        if (items.length > 0) {
            const client = new EtsyClient();
            let successCount = 0;
            let failureCount = 0;

            for (const item of items) {
                try {
                    console.log(`[Etsy] Updating listing ${item.listingId} (${item.productSku}): price=${item.price} USD, qty=${item.quantity}`);
                    
                    // Get current inventory
                    const currentInventory = await client.getListingInventory(item.listingId, integration.accessToken);
                    
                    // Prepare inventory update payload per Etsy API docs
                    const inventoryWithProducts = (currentInventory.products && currentInventory.products.length > 0)
                        ? currentInventory.products.map((etsyProd: any) => {
                            const localVariant = item.variants.find((v: any) => v.sku === etsyProd.sku);
                            let targetPrice = item.price;
                            let targetQty = item.quantity;
                            
                            if (localVariant) {
                                targetPrice = Number(localVariant.priceUSD) || Number(localVariant.priceTRY) / 35;
                                targetQty = localVariant.quantity || 0;
                            }

                            return {
                                sku: etsyProd.sku,
                                property_values: (etsyProd.property_values || []).map((pv: any) => ({
                                    property_id: pv.property_id,
                                    property_name: pv.property_name,
                                    value_ids: pv.value_ids,
                                    values: pv.values
                                })),
                                offerings: (etsyProd.offerings || []).map((offering: any) => ({
                                    price: targetPrice,
                                    quantity: targetQty,
                                    is_enabled: offering.is_enabled !== undefined ? offering.is_enabled : true,
                                    readiness_state_id: offering.readiness_state_id || 1
                                }))
                            };
                        })
                        : [
                            {
                                sku: item.productSku,
                                property_values: [],
                                offerings: [
                                    {
                                        price: item.price,
                                        quantity: item.quantity,
                                        is_enabled: true,
                                        readiness_state_id: 1
                                    }
                                ]
                            }
                        ];

                    const updatedInventory = {
                        products: inventoryWithProducts,
                        price_on_property: currentInventory.price_on_property || [],
                        quantity_on_property: currentInventory.quantity_on_property || [],
                        sku_on_property: currentInventory.sku_on_property || [],
                        readiness_state_on_property: currentInventory.readiness_state_on_property || [],
                        listing: currentInventory.listing || null
                    };

                    const result = await client.updateListingInventory(
                        item.listingId,
                        integration.accessToken,
                        updatedInventory
                    );

                    console.log(`[Etsy] ✓ Listing ${item.listingId} updated successfully. Response:`, result);
                    
                    // Log successful update to IntegrationLog
                    await IntegrationLog.create({
                        userId: integration.userId,
                        platform: 'etsy',
                        endpoint: 'PUT /v3/application/listings/{listing_id}/inventory',
                        requestMethod: 'SYNC',
                        isSuccess: true,
                        requestPayload: updatedInventory,
                        responsePayload: result
                    });

                    successCount++;
                } catch (err: any) {
                    console.error(`[Etsy] ✗ Failed to update listing ${item.listingId} (${item.productSku}):`, err.message);
                    
                    // Log failed update to IntegrationLog
                    await IntegrationLog.create({
                        userId: integration.userId,
                        platform: 'etsy',
                        endpoint: 'PUT /v3/application/listings/{listing_id}/inventory',
                        requestMethod: 'SYNC',
                        isSuccess: false,
                        errorMessage: err.message,
                        requestPayload: {
                            price: item.price,
                            quantity: item.quantity
                        }
                    });

                    failureCount++;
                    // Continue with other listings instead of stopping
                }
            }

            console.log(`[Etsy] Price sync completed: ${successCount}/${items.length} successful, ${failureCount} failed.`);
        } else {
            console.log(`[Etsy] No active listings to update. Create products via seller panel first.`);
        }
    }
}

export default new MarketplacePriceSyncService();
