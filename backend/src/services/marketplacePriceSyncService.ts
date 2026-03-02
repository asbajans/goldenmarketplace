/**
 * MarketplacePriceSyncService
 * 
 * Triggered after each hourly gold price update.
 * Reads all active marketplace integrations and pushes updated prices to each platform.
 */

import MarketplaceIntegration from '../models/MarketplaceIntegration';
import Product from '../models/Product';
import Store from '../models/Store';
import TrendyolClient, { TrendyolProduct } from '../integrations/trendyol/trendyolClient';
import HepsiburadaClient, { HepsiburadaProduct } from '../integrations/hepsiburada/hepsiburadaClient';
import N11Client, { N11Product } from '../integrations/n11/n11Client';

class MarketplacePriceSyncService {

    /**
     * Sync ALL active marketplace integrations for all users.
     * Called after gold price update completes.
     */
    async syncAll(): Promise<{ synced: number; failed: number; errors: string[] }> {
        const stats = { synced: 0, failed: 0, errors: [] as string[] };
        console.log('[MarketplaceSync] Starting price sync for all active intergrations...');

        try {
            // Find all active integrations
            const integrations = await MarketplaceIntegration.findAll({
                // @ts-ignore
                where: { isActive: true }
            });

            if (!integrations.length) {
                console.log('[MarketplaceSync] No active integrations found, skipping.');
                return stats;
            }

            console.log(`[MarketplaceSync] Found ${integrations.length} active integrations to sync.`);

            // Group by userId so we only fetch each user's products once
            const byUser: Record<string, typeof integrations> = {};
            for (const integration of integrations) {
                if (!byUser[integration.userId]) byUser[integration.userId] = [];
                byUser[integration.userId].push(integration);
            }

            // Process each user
            for (const [userId, userIntegrations] of Object.entries(byUser)) {
                try {
                    // Find user's store
                    const store = await Store.findOne({ where: { userId } });
                    if (!store) continue;

                    // Get the user's active products with current prices
                    const products = await Product.findAll({
                        // @ts-ignore
                        where: { storeId: store.id, isActive: true }
                    });

                    if (!products.length) continue;

                    // Sync each integration
                    for (const integration of userIntegrations) {
                        try {
                            await this.syncForPlatform(integration, products);
                            stats.synced++;

                            // Update lastSyncAt
                            await integration.update({ lastSyncAt: new Date() });
                        } catch (err: any) {
                            stats.failed++;
                            const errMsg = `[${integration.platform}] userId=${userId}: ${err.message}`;
                            stats.errors.push(errMsg);
                            console.error('[MarketplaceSync]', errMsg);
                        }
                    }
                } catch (err: any) {
                    console.error(`[MarketplaceSync] Error processing userId=${userId}:`, err.message);
                }
            }
        } catch (err: any) {
            console.error('[MarketplaceSync] Fatal error in syncAll:', err.message);
        }

        console.log(`[MarketplaceSync] Done. Synced: ${stats.synced}, Failed: ${stats.failed}`);
        return stats;
    }

    /**
     * Sync a single integration (one platform for one user)
     */
    async syncForPlatform(integration: MarketplaceIntegration, products: Product[]): Promise<void> {
        const { platform, apiKey, apiSecret, shopId } = integration;

        switch (platform) {
            case 'trendyol':
                await this.syncTrendyol(apiKey, apiSecret, shopId!, products);
                break;

            case 'hepsiburada':
                await this.syncHepsiburada(apiKey, apiSecret, shopId!, products);
                break;

            case 'n11':
                await this.syncN11(apiKey, apiSecret, products);
                break;

            case 'amazon':
                console.log('[Amazon] Price sync skipped — SP-API not yet implemented');
                break;

            case 'etsy':
                console.log('[Etsy] Price sync skipped — OAuth token based, handled separately');
                break;

            default:
                console.warn(`[MarketplaceSync] Unknown platform: ${platform}`);
        }
    }

    private async syncTrendyol(apiKey: string, apiSecret: string, sellerId: string, products: Product[]): Promise<void> {
        const client = new TrendyolClient(apiKey, apiSecret, sellerId);
        const items: TrendyolProduct[] = products.map(p => ({
            barcode: p.sku,
            listPrice: Number(p.priceTRY) * 1.1, // List price slightly above sale
            salePrice: Number(p.priceTRY),
            quantity: p.quantity
        }));

        if (items.length > 0) {
            await client.updatePrices(items);
        }
    }

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

    private async syncN11(appKey: string, appSecret: string, products: Product[]): Promise<void> {
        const client = new N11Client(appKey, appSecret);
        const items: N11Product[] = products.map(p => ({
            productId: p.sku,
            price: Number(p.priceTRY),
            stock: p.quantity
        }));

        if (items.length > 0) {
            await client.updatePrices(items);
        }
    }
}

export default new MarketplacePriceSyncService();
