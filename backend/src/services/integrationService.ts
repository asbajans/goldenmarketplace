
import MarketplaceIntegration from '../models/MarketplaceIntegration';

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
     * Handle Etsy OAuth Callback
     * Exchanges code for token
     */
    async handleEtsyCallback(userId: string, code: string, codeVerifier: string) {
        // Mock Implementation for now
        // In real life: POST to https://api.etsy.com/v3/public/oauth/token

        console.log(`Exchanging Etsy code ${code} for user ${userId} with verifier ${codeVerifier}`);

        // Simulate token response
        const mockTokenResponse = {
            access_token: 'mock_etsy_access_token_' + Date.now(),
            refresh_token: 'mock_etsy_refresh_token_' + Date.now(),
            shop_id: 'mock_shop_123'
        };

        // Find or Create Integration
        // @ts-ignore
        let integration = await MarketplaceIntegration.findOne({ where: { userId, platform: 'etsy' } });

        if (integration) {
            await integration.update({
                accessToken: mockTokenResponse.access_token,
                refreshToken: mockTokenResponse.refresh_token,
                shopId: mockTokenResponse.shop_id,
                isActive: true,
                lastSyncAt: new Date()
            });
        } else {
            integration = await MarketplaceIntegration.create({
                userId,
                platform: 'etsy',
                accessToken: mockTokenResponse.access_token,
                refreshToken: mockTokenResponse.refresh_token,
                shopId: mockTokenResponse.shop_id,
                isActive: true,
                lastSyncAt: new Date()
            });
        }

        return integration;
    }
}

export default new IntegrationService();
