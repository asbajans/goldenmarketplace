import axios from 'axios';

export class EtsyClient {
    private apiKey: string;
    private baseUrl = 'https://api.etsy.com/v3';

    constructor() {
        this.apiKey = process.env.ETSY_KEY || '';
    }

    /**
     * Exchanges an OAuth authorization code for an access token
     */
    async exchangeCodeForToken(code: string, codeVerifier: string, redirectUri: string) {
        if (!this.apiKey) {
            throw new Error('ETSY_KEY is not defined in environment variables');
        }

        const data = {
            grant_type: 'authorization_code',
            client_id: this.apiKey,
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
        if (!this.apiKey) {
            throw new Error('ETSY_KEY is not defined in environment variables');
        }

        try {
            const response = await axios.get(`${this.baseUrl}/application/users/me`, {
                headers: {
                    'x-api-key': this.apiKey,
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            // Note: v3 '/application/users/me' usually returns user ID, 
            // We then get the shop associated with the user
            const userId = response.data.user_id;

            const shopResponse = await axios.get(`${this.baseUrl}/application/users/${userId}/shops`, {
                headers: {
                    'x-api-key': this.apiKey,
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            return {
                userId,
                shopId: shopResponse.data.shop_id || shopResponse.data.id || (shopResponse.data.results && shopResponse.data.results[0]?.shop_id)
            };
        } catch (error: any) {
            console.error('Etsy GetMe Error:', error.response?.data || error.message);
            throw new Error('Failed to fetch user/shop details from Etsy');
        }
    }

    /**
     * Verify connection using the existing token
     */
    async verifyConnection(accessToken: string) {
        if (!this.apiKey) {
            throw new Error('ETSY_KEY is not defined in environment variables');
        }

        try {
            const response = await axios.get(`${this.baseUrl}/application/users/me`, {
                headers: {
                    'x-api-key': this.apiKey,
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
