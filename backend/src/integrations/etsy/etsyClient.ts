import axios from 'axios';
import { GlobalSetting } from '../../models/GlobalSetting';

export class EtsyClient {
    private baseUrl = 'https://api.etsy.com/v3';

    /**
     * Helper to get the Etsy API Key directly from database
     */
    private async getApiCredentials(): Promise<{ apiKey: string; apiSecret: string }> {
        const keySetting = await GlobalSetting.findOne({ where: { key: 'etsy_api_key' } });
        const secretSetting = await GlobalSetting.findOne({ where: { key: 'etsy_api_secret' } });
        
        if (!keySetting || !keySetting.value || !secretSetting || !secretSetting.value) {
            throw new Error('Etsy API Key or Secret is not configured in Admin Settings.');
        }
        
        return { apiKey: keySetting.value, apiSecret: secretSetting.value };
    }

    /**
     * Exchanges an OAuth authorization code for an access token
     */
    async exchangeCodeForToken(code: string, codeVerifier: string, redirectUri: string) {
        const { apiKey } = await this.getApiCredentials();

        const data = {
            grant_type: 'authorization_code',
            client_id: apiKey,
            redirect_uri: redirectUri,
            code: code,
            code_verifier: codeVerifier
        };

        try {
            const response = await axios.post(`${this.baseUrl}/public/oauth/token`, data, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error: any) {
            console.error('Etsy Token Exchange Error:', error.response?.data || error.message);
            throw new Error('Failed to exchange Etsy authorization code for token');
        }
    }

    /**
     * Gets the current user (shop) details using the access token
     */
    async getMe(accessToken: string) {
        const { apiKey, apiSecret } = await this.getApiCredentials();
        const xApiKey = `${apiKey}.${apiSecret}`;

        try {
            const response = await axios.get(`${this.baseUrl}/application/users/me`, {
                headers: {
                    'x-api-key': xApiKey,
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            const userId = response.data.user_id;
            let shopId = null;

            try {
                const shopResponse = await axios.get(`${this.baseUrl}/application/users/${userId}/shops`, {
                    headers: {
                        'x-api-key': xApiKey,
                        'Authorization': `Bearer ${accessToken}`
                    }
                });
                shopId = shopResponse.data.shop_id || shopResponse.data.id || (shopResponse.data.results && shopResponse.data.results[0]?.shop_id);
            } catch (shopError: any) {
                console.warn(`[Etsy] Could not fetch shop for user ${userId}. They might not have an active shop yet. Message: ${shopError.message}`);
                // Proceed without a shopId so the integration is at least saved
            }

            return {
                userId,
                shopId
            };
        } catch (error: any) {
            console.error('Etsy GetMe Error:', error.response?.data || error.message);
            throw new Error('Failed to fetch user details from Etsy');
        }
    }

    /**
     * Verify connection using the existing token
     */
    async verifyConnection(accessToken: string) {
        const { apiKey, apiSecret } = await this.getApiCredentials();
        const xApiKey = `${apiKey}.${apiSecret}`;

        try {
            const response = await axios.get(`${this.baseUrl}/application/users/me`, {
                headers: {
                    'x-api-key': xApiKey,
                    'Authorization': `Bearer ${accessToken}`
                }
            });
            return response.data;
        } catch (error: any) {
            console.error('Etsy Verify Connection Error:', error.response?.data || error.message);
            throw new Error('Failed to verify Etsy connection. Token might be invalid or expired.');
        }
    }
}

export default new EtsyClient();
