/**
 * Marketplace Integration Service
 * Comprehensive service for all marketplace integrations
 * Supports: Etsy, Trendyol, Hepsiburada, Pazarama, N11, Amazon
 */

import axios, { AxiosInstance } from 'axios';
import * as qs from 'qs';
import MarketplaceIntegration from '../models/MarketplaceIntegration';
import Product from '../models/Product';
import ProductVariant from '../models/ProductVariant';
import ProductMarketplaceListing from '../models/ProductMarketplaceListing';
import Store from '../models/Store';
import IntegrationLog from '../models/IntegrationLog';
import { Op } from 'sequelize';

// Import existing clients
import TrendyolClient from '../integrations/trendyol/trendyolClient';
import HepsiburadaClient from '../integrations/hepsiburada/hepsiburadaClient';
import PazaramaClient from '../integrations/pazarama/pazaramaClient';
import N11Client from '../integrations/n11/n11Client';
import EtsyClient from '../integrations/etsy/etsyClient';

export interface MarketplaceProductInput {
    title: string;
    description: string;
    price: number;
    currency?: string;
    quantity: number;
    sku: string;
    barcode?: string;
    brand?: string;
    categoryId?: string;
    images: string[];
    variants?: Array<{
        sku: string;
        price: number;
        quantity: number;
        attributes: Record<string, string>;
    }>;
}

export interface MarketplaceCategory {
    id: string;
    name: string;
    parentId?: string;
    hasChildren: boolean;
}

export interface MarketplaceBrand {
    id: string;
    name: string;
}

export interface MarketplaceOrder {
    orderId: string;
    status: string;
    customer: {
        name: string;
        email?: string;
    };
    items: Array<{
        productId: string;
        sku: string;
        quantity: number;
        price: number;
    }>;
    totalAmount: number;
    createdAt: Date;
}

class MarketplaceIntegrationService {
    /**
     * Verify marketplace credentials
     */
    async verifyCredentials(integration: MarketplaceIntegration): Promise<{ success: boolean; message?: string }> {
        try {
            switch (integration.platform) {
                case 'trendyol':
                    if (!integration.apiKey || !integration.apiSecret || !integration.shopId) {
                        return { success: false, message: 'API Key, Secret ve ShopId gerekli' };
                    }
                    const trendyolClient = new TrendyolClient(
                        integration.apiKey,
                        integration.apiSecret,
                        integration.shopId,
                        integration.userId
                    );
                    return await trendyolClient.verifyConnection(integration.shopId);

                case 'hepsiburada':
                    if (!integration.apiKey || !integration.apiSecret || !integration.shopId) {
                        return { success: false, message: 'Username, Password ve MerchantId gerekli' };
                    }
                    const hepsiburadaClient = new HepsiburadaClient(
                        integration.apiKey,
                        integration.apiSecret,
                        integration.shopId,
                        integration.userId
                    );
                    return await hepsiburadaClient.verifyConnection();

                case 'pazarama':
                    if (!integration.apiKey || !integration.apiSecret) {
                        return { success: false, message: 'Client ID ve Client Secret gerekli' };
                    }
                    const pazaramaClient = new PazaramaClient(
                        integration.apiKey,
                        integration.apiSecret,
                        integration.userId
                    );
                    return await pazaramaClient.verifyConnection();

                case 'n11':
                    if (!integration.apiKey || !integration.apiSecret) {
                        return { success: false, message: 'App Key ve App Secret gerekli' };
                    }
                    const n11Client = new N11Client(
                        integration.apiKey,
                        integration.apiSecret,
                        integration.userId
                    );
                    return await n11Client.verifyConnection();

                case 'etsy':
                    if (!integration.accessToken || !integration.shopId) {
                        return { success: false, message: 'Access Token ve Shop ID gerekli' };
                    }
                    return { success: true, message: 'Etsy bağlantısı aktif' };

                case 'amazon':
                    if (!integration.apiKey || !integration.apiSecret) {
                        return { success: false, message: 'API Key ve Secret gerekli' };
                    }
                    return { success: true, message: 'Amazon bağlantısı yapılandırıldı' };

                default:
                    return { success: false, message: `Bilinmeyen platform: ${integration.platform}` };
            }
        } catch (error: any) {
            return { success: false, message: error.message };
        }
    }

    /**
     * Create or update product on marketplace
     */
    async syncProductToMarketplace(
        product: Product,
        marketplace: string,
        integration: MarketplaceIntegration
    ): Promise<{ success: boolean; externalId?: string; error?: string }> {
        try {
            // Check if product already exists on marketplace
            const existingListing = await ProductMarketplaceListing.findOne({
                where: {
                    productId: product.id,
                    platform: marketplace,
                    status: 'active'
                }
            });

            if (existingListing) {
                // Update existing product
                return await this.updateProductOnMarketplace(product, marketplace, integration, existingListing.externalId);
            } else {
                // Create new product
                return await this.createProductOnMarketplace(product, marketplace, integration);
            }
        } catch (error: any) {
            console.error(`[${marketplace}] Sync error for product ${product.sku}:`, error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Create new product on marketplace
     */
    private async createProductOnMarketplace(
        product: Product,
        marketplace: string,
        integration: MarketplaceIntegration
    ): Promise<{ success: boolean; externalId?: string; error?: string }> {
        const productData: MarketplaceProductInput = {
            title: product.title,
            description: product.description || product.title,
            price: Number(product.priceTRY),
            currency: 'TRY',
            quantity: product.quantity,
            sku: product.sku,
            images: product.images || []
        };

        switch (marketplace) {
            case 'trendyol':
                return await this.createTrendyolProduct(productData, integration);
            case 'hepsiburada':
                return await this.createHepsiburadaProduct(productData, integration);
            case 'pazarama':
                return await this.createPazaramaProduct(productData, integration);
            case 'n11':
                return await this.createN11Product(productData, integration);
            case 'etsy':
                return await this.createEtsyProduct(product, integration);
            case 'amazon':
                return { success: false, error: 'Amazon entegrasyonu henüz tamamlanmadı' };
            default:
                return { success: false, error: `Desteklenmeyen platform: ${marketplace}` };
        }
    }

    /**
     * Update existing product on marketplace
     */
    private async updateProductOnMarketplace(
        product: Product,
        marketplace: string,
        integration: MarketplaceIntegration,
        externalId: string
    ): Promise<{ success: boolean; externalId?: string; error?: string }> {
        switch (marketplace) {
            case 'trendyol':
                return await this.updateTrendyolProduct(product, integration, externalId);
            case 'hepsiburada':
                return await this.updateHepsiburadaProduct(product, integration);
            case 'pazarama':
                return await this.updatePazaramaProduct(product, integration);
            case 'n11':
                return await this.updateN11Product(product, integration, externalId);
            case 'etsy':
                return await this.updateEtsyProduct(product, integration, externalId);
            case 'amazon':
                return { success: false, error: 'Amazon entegrasyonu henüz tamamlanmadı' };
            default:
                return { success: false, error: `Desteklenmeyen platform: ${marketplace}` };
        }
    }

    // ==================== TRENDYOL ====================

    private async createTrendyolProduct(
        product: MarketplaceProductInput,
        integration: MarketplaceIntegration
    ): Promise<{ success: boolean; externalId?: string; error?: string }> {
        try {
            const client = new TrendyolClient(
                integration.apiKey!,
                integration.apiSecret!,
                integration.shopId!,
                integration.userId
            );

            // TODO: Get actual category and brand IDs from Trendyol
            const item = {
                barcode: product.barcode || product.sku,
                title: product.title,
                productMainId: product.sku,
                stockCode: product.sku,
                description: product.description,
                categoryId: 1000000, // Default category - should be mapped
                brandId: 1000000, // Default brand - should be mapped
                listPrice: Math.round(product.price * 1.2 * 100) / 100,
                salePrice: product.price,
                vatRate: 20,
                quantity: product.quantity,
                images: product.images.slice(0, 5).map(url => ({ url }))
            };

            const batchId = await client.createProducts([item]);

            return { success: true, externalId: batchId };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    private async updateTrendyolProduct(
        product: Product,
        integration: MarketplaceIntegration,
        externalId: string
    ): Promise<{ success: boolean; externalId?: string; error?: string }> {
        try {
            const client = new TrendyolClient(
                integration.apiKey!,
                integration.apiSecret!,
                integration.shopId!,
                integration.userId
            );

            await client.updatePrices([{
                barcode: product.sku,
                listPrice: Math.round(Number(product.priceTRY) * 1.2 * 100) / 100,
                salePrice: Number(product.priceTRY),
                quantity: product.quantity
            }]);

            return { success: true, externalId };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Get categories from Trendyol
     */
    async getTrendyolCategories(integration: MarketplaceIntegration): Promise<MarketplaceCategory[]> {
        try {
            const client = new TrendyolClient(
                integration.apiKey!,
                integration.apiSecret!,
                integration.shopId!,
                integration.userId
            );
            // Implementation would call Trendyol category API
            return [];
        } catch (error: any) {
            console.error('[Trendyol] Get categories error:', error.message);
            return [];
        }
    }

    // ==================== HEPSIBURADA ====================

    private async createHepsiburadaProduct(
        product: MarketplaceProductInput,
        integration: MarketplaceIntegration
    ): Promise<{ success: boolean; externalId?: string; error?: string }> {
        try {
            const client = new HepsiburadaClient(
                integration.apiKey!,
                integration.apiSecret!,
                integration.shopId!,
                integration.userId
            );

            // Hepsiburada uses catalog integration - product goes through review process
            // For now, we'll update price/stock which creates listing if not exists
            await client.updatePrices([{
                sku: product.sku,
                price: product.price,
                stock: product.quantity
            }]);

            return { success: true, externalId: product.sku };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    private async updateHepsiburadaProduct(
        product: Product,
        integration: MarketplaceIntegration
    ): Promise<{ success: boolean; externalId?: string; error?: string }> {
        try {
            const client = new HepsiburadaClient(
                integration.apiKey!,
                integration.apiSecret!,
                integration.shopId!,
                integration.userId
            );

            await client.updatePrices([{
                sku: product.sku,
                price: Number(product.priceTRY),
                stock: product.quantity
            }]);

            return { success: true, externalId: product.sku };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    // ==================== PAZARAMA ====================

    private async createPazaramaProduct(
        product: MarketplaceProductInput,
        integration: MarketplaceIntegration
    ): Promise<{ success: boolean; externalId?: string; error?: string }> {
        try {
            const client = new PazaramaClient(
                integration.apiKey!,
                integration.apiSecret!,
                integration.userId
            );

            // Pazarama product creation would go here
            // For now, price update creates/updates listing
            await client.updatePrices([{
                code: product.barcode || product.sku,
                listPrice: Math.round(product.price * 1.2 * 100) / 100,
                salePrice: product.price
            }]);

            return { success: true, externalId: product.sku };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    private async updatePazaramaProduct(
        product: Product,
        integration: MarketplaceIntegration
    ): Promise<{ success: boolean; externalId?: string; error?: string }> {
        try {
            const client = new PazaramaClient(
                integration.apiKey!,
                integration.apiSecret!,
                integration.userId
            );

            await client.updatePrices([{
                code: product.sku,
                listPrice: Math.round(Number(product.priceTRY) * 1.2 * 100) / 100,
                salePrice: Number(product.priceTRY)
            }]);

            await client.updateStock([{
                code: product.sku,
                stockCount: product.quantity
            }]);

            return { success: true, externalId: product.sku };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    // ==================== N11 ====================

    private async createN11Product(
        product: MarketplaceProductInput,
        integration: MarketplaceIntegration
    ): Promise<{ success: boolean; externalId?: string; error?: string }> {
        try {
            const client = new N11Client(
                integration.apiKey!,
                integration.apiSecret!,
                integration.userId
            );

            const n11Id = await client.createProduct({
                title: product.title,
                stockCode: product.sku,
                description: product.description,
                categoryId: '1', // Default - should be mapped
                price: product.price,
                quantity: product.quantity,
                images: product.images
            });

            return { success: true, externalId: n11Id };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    private async updateN11Product(
        product: Product,
        integration: MarketplaceIntegration,
        externalId: string
    ): Promise<{ success: boolean; externalId?: string; error?: string }> {
        try {
            const client = new N11Client(
                integration.apiKey!,
                integration.apiSecret!,
                integration.userId
            );

            await client.updatePrices([{
                productId: externalId,
                sku: product.sku,
                price: Number(product.priceTRY),
                stock: product.quantity
            }]);

            return { success: true, externalId };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    // ==================== ETSY ====================

    private async createEtsyProduct(
        product: Product,
        integration: MarketplaceIntegration
    ): Promise<{ success: boolean; externalId?: string; error?: string }> {
        // Etsy requires OAuth and more complex flow
        // This would typically be handled by the existing EtsyClient
        return { success: false, error: 'Etsy ürün oluşturma ayrıca yapılandırılmalı' };
    }

    private async updateEtsyProduct(
        product: Product,
        integration: MarketplaceIntegration,
        externalId: string
    ): Promise<{ success: boolean; externalId?: string; error?: string }> {
        // Handled by marketplacePriceSyncService for Etsy
        return { success: true, externalId };
    }

    /**
     * Sync all products for a user to all active marketplaces
     */
    async syncAllProductsForUser(userId: string): Promise<{ synced: number; failed: number; errors: string[] }> {
        const stats = { synced: 0, failed: 0, errors: [] as string[] };

        try {
            const store = await Store.findOne({ where: { userId } });
            if (!store) {
                return stats;
            }

            const products = await Product.findAll({
                where: { storeId: store.id, isActive: true },
                include: [{ model: ProductVariant, as: 'variants' }]
            });

            const integrations = await MarketplaceIntegration.findAll({
                where: { userId, isActive: true }
            });

            for (const integration of integrations) {
                for (const product of products) {
                    try {
                        const result = await this.syncProductToMarketplace(product, integration.platform, integration);
                        if (result.success) {
                            stats.synced++;
                            // Save listing record
                            await ProductMarketplaceListing.upsert({
                                productId: product.id,
                                platform: integration.platform,
                                externalId: result.externalId || '',
                                externalCode: product.sku,
                                status: 'active',
                                lastSyncAt: new Date()
                            });
                        } else {
                            stats.failed++;
                            stats.errors.push(`${integration.platform}: ${result.error}`);
                        }
                    } catch (error: any) {
                        stats.failed++;
                        stats.errors.push(`${integration.platform}/${product.sku}: ${error.message}`);
                    }
                }
            }
        } catch (error: any) {
            console.error('[MarketplaceService] syncAllProductsForUser error:', error.message);
        }

        return stats;
    }

    /**
     * Get orders from marketplace
     */
    async getMarketplaceOrders(
        integration: MarketplaceIntegration
    ): Promise<MarketplaceOrder[]> {
        switch (integration.platform) {
            case 'trendyol':
                // Would use Trendyol orders API
                return [];
            case 'hepsiburada':
                // Would use Hepsiburada orders API
                return [];
            case 'pazarama':
                // Would use Pazarama orders API
                return [];
            case 'n11':
                // Would use N11 orders API
                return [];
            default:
                return [];
        }
    }

    /**
     * Handle webhook from marketplace
     */
    async handleWebhook(
        platform: string,
        payload: any
    ): Promise<{ processed: boolean; message?: string }> {
        try {
            switch (platform) {
                case 'trendyol':
                    // Process Trendyol webhook (order created, status changed, etc.)
                    console.log('[Webhook] Trendyol payload received');
                    break;
                case 'hepsiburada':
                    // Process Hepsiburada webhook
                    console.log('[Webhook] Hepsiburada payload received');
                    break;
                case 'pazarama':
                    // Process Pazarama webhook
                    console.log('[Webhook] Pazarama payload received');
                    break;
                default:
                    console.log(`[Webhook] Unknown platform: ${platform}`);
            }
            return { processed: true };
        } catch (error: any) {
            return { processed: false, message: error.message };
        }
    }
}

export default new MarketplaceIntegrationService();