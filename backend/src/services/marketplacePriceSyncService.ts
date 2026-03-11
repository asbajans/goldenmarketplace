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
import Store from '../models/Store';
import TrendyolClient from '../integrations/trendyol/trendyolClient';
import HepsiburadaClient, { HepsiburadaProduct } from '../integrations/hepsiburada/hepsiburadaClient';
import N11Client from '../integrations/n11/n11Client';

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

                const products = await Product.findAll({ where: { storeId: store.id, isActive: true } });
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

    async syncForPlatform(integration: MarketplaceIntegration, products: Product[]): Promise<void> {
        const { platform, apiKey, apiSecret, shopId } = integration;

        switch (platform) {
            case 'trendyol':
                await this.syncTrendyol(integration, products);
                break;
            case 'hepsiburada':
                await this.syncHepsiburada(apiKey, apiSecret, shopId!, products);
                break;
            case 'n11':
                await this.syncN11(integration, products);
                break;
            case 'etsy':
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

        const client = new TrendyolClient(apiKey, apiSecret, shopId);
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
    private async syncHepsiburada(username: string, password: string, merchantId: string, products: Product[]): Promise<void> {
        const client = new HepsiburadaClient(username, password, merchantId);
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

        const client = new N11Client(apiKey, apiSecret);
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
}

export default new MarketplacePriceSyncService();
