import MarketplaceIntegration from '../models/MarketplaceIntegration';
import EtsyClient from '../integrations/etsy/etsyClient';
import TrendyolClient from '../integrations/trendyol/trendyolClient';
import HepsiburadaClient from '../integrations/hepsiburada/hepsiburadaClient';
import N11Client from '../integrations/n11/n11Client';

class IntegrationService {
    /**
     * Connect a new platform
     */
    async connectPlatform(userId: string, data: { platform: string; apiKey?: string; apiSecret?: string; shopId?: string }) {
        // @ts-ignore
        const existing = await MarketplaceIntegration.findOne({ where: { userId, platform: data.platform } });
        if (existing) {
            throw new Error('Platform already connected');
        }

        return await MarketplaceIntegration.create({
            userId,
            ...data
        });
    }

    /**
     * Get user integrations
     */
    async getUserIntegrations(userId: string) {
        return await MarketplaceIntegration.findAll({ where: { userId } });
    }

    /**
     * Disconnect platform
     */
    async disconnectPlatform(userId: string, platform: string) {
        return await MarketplaceIntegration.destroy({ where: { userId, platform } });
    }

    /**
     * Update credentials
     */
    async updateCredentials(userId: string, platform: string, data: Partial<MarketplaceIntegration>) {
        const integration = await MarketplaceIntegration.findOne({ where: { userId, platform } });
        if (!integration) throw new Error('Integration not found');
        return await integration.update(data);
    }

    /**
     * Test connection for a given platform
     */
    async testConnection(userId: string, platform: string) {
        // @ts-ignore
        const integration = await MarketplaceIntegration.findOne({ where: { userId, platform } });
        if (!integration) throw new Error('Integration not found');

        if (platform === 'etsy') {
            if (!integration.accessToken) throw new Error('Etsy access token not found');
            const data = await EtsyClient.verifyConnection(integration.accessToken);
            return { status: 'success', message: 'Etsy bağlantısı çalışıyor!', shopId: data.shop_id };
        }

        if (platform === 'trendyol') {
            if (!integration.apiKey || !integration.shopId) throw new Error('Trendyol API Key veya Satıcı ID eksik');
            const client = new TrendyolClient(integration.apiKey, integration.apiSecret, integration.shopId);
            const result = await client.verifyConnection(integration.shopId);
            return { status: 'success', message: `Trendyol bağlantısı çalışıyor! Satıcı: ${result.sellerName}` };
        }

        if (platform === 'hepsiburada') {
            if (!integration.apiKey || !integration.shopId) throw new Error('Hepsiburada kullanıcı adı veya Merchant ID eksik');
            const client = new HepsiburadaClient(integration.apiKey, integration.apiSecret, integration.shopId);
            const result = await client.verifyConnection();
            return { status: 'success', message: `Hepsiburada bağlantısı çalışıyor! Merchant: ${result.merchantId}` };
        }

        if (platform === 'n11') {
            if (!integration.apiKey) throw new Error('N11 API Key eksik');
            const client = new N11Client(integration.apiKey, integration.apiSecret);
            await client.verifyConnection();
            return { status: 'success', message: `N11 bağlantısı çalışıyor!` };
        }

        if (platform === 'amazon') {
            return { status: 'info', message: 'Amazon SP-API entegrasyonu henüz tamamlanmadı.' };
        }

        return { status: 'info', message: `${platform} için test bağlantısı henüz eklenmedi.` };
    }

    /**
     * Handle Etsy OAuth Callback
     * Exchanges code for token using real EtsyClient
     */
    async handleEtsyCallback(userId: string, code: string, codeVerifier: string, redirectUri: string) {
        console.log(`Exchanging Etsy code for user ${userId}`);

        // 1. Get tokens
        const tokenResponse = await EtsyClient.exchangeCodeForToken(code, codeVerifier, redirectUri);
        const { access_token, refresh_token } = tokenResponse;

        // 2. Fetch the shop ID using the access token
        const me = await EtsyClient.getMe(access_token);
        const shopId = String(me.shopId);

        // Find or Create Integration
        // @ts-ignore
        let integration = await MarketplaceIntegration.findOne({ where: { userId, platform: 'etsy' } });

        if (integration) {
            await integration.update({
                accessToken: access_token,
                refreshToken: refresh_token,
                shopId: shopId,
                isActive: true,
                lastSyncAt: new Date()
            });
        } else {
            integration = await MarketplaceIntegration.create({
                userId,
                platform: 'etsy',
                accessToken: access_token,
                refreshToken: refresh_token,
                shopId: shopId,
                isActive: true,
                lastSyncAt: new Date()
            });
        }

        return integration;
    }
}

export default new IntegrationService();
