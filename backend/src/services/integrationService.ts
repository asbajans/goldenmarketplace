import MarketplaceIntegration from '../models/MarketplaceIntegration';
import EtsyClient from '../integrations/etsy/etsyClient';

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
            return {
                status: 'success',
                message: 'Etsy connection works!',
                shopId: data.shop_id || integration.shopId
            };
        }

        // Future platforms
        return {
            status: 'info',
            message: `Test connection not implemented for ${platform} yet.`
        };
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
