import axios from 'axios';
import FormData from 'form-data';
import { GlobalSetting } from '../../models/GlobalSetting';

export interface EtsyCreateListingPayload {
    quantity: number;
    title: string;
    description: string;
    price: number;
    who_made: 'i_did' | 'someone_else' | 'collective';
    when_made: string;
    taxonomy_id: number;
    shipping_profile_id?: number;
    return_policy_id?: number;
    readiness_state_id?: number;
    is_supply?: boolean;
    is_customizable?: boolean;
    should_auto_renew?: boolean;
    tags?: string[];
}

export class EtsyClient {
    private baseUrl = 'https://api.etsy.com/v3';
    private integrationInstance?: any;

    constructor(integrationInstance?: any) {
        this.integrationInstance = integrationInstance;
    }

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
     * Refresh OAuth access token
     */
    async refreshAccessToken(refreshToken: string) {
        const { apiKey } = await this.getApiCredentials();
        const data = {
            grant_type: 'refresh_token',
            client_id: apiKey,
            refresh_token: refreshToken
        };

        try {
            const response = await axios.post(`${this.baseUrl}/public/oauth/token`, data, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error: any) {
            console.error('Etsy Token Refresh Error:', error.response?.data || error.message);
            throw new Error('Failed to refresh Etsy token');
        }
    }

    /**
     * Wrapper to automatically catch 401 Unauthorized and refresh the token 
     * if the integrationInstance and refreshToken are available.
     */
    private async withTokenRefresh<T>(originalToken: string, operation: (token: string) => Promise<T>): Promise<T> {
        try {
            return await operation(originalToken);
        } catch (error: any) {
            const isUnauthorized = error.response?.status === 401 || (error.response?.data && String(error.response.data).toLowerCase().includes('token'));
            if (isUnauthorized && this.integrationInstance && this.integrationInstance.refreshToken) {
                console.log(`[Etsy] 401 Unauthorized detected. Trying to auto-refresh token...`);
                try {
                    const newTokens = await this.refreshAccessToken(this.integrationInstance.refreshToken);
                    
                    // Automatically update model instances if available
                    this.integrationInstance.accessToken = newTokens.access_token;
                    this.integrationInstance.refreshToken = newTokens.refresh_token;
                    if (typeof this.integrationInstance.save === 'function') {
                        await this.integrationInstance.save();
                    }
                    
                    console.log(`[Etsy] Token refreshed and saved successfully. Retrying operation.`);
                    return await operation(newTokens.access_token);
                } catch (refreshErr: any) {
                    console.error('[Etsy] Auto-refresh failed. Need manual reconnect.', refreshErr.message);
                    // Don't throw refreshErr, throw the original 401 so callers handle it normally
                    throw error;
                }
            }
            throw error;
        }
    }

    /**
     * Gets the current user (shop) details using the access token
     */
    async getMe(accessToken: string) {
        const { apiKey, apiSecret } = await this.getApiCredentials();
        const xApiKey = `${apiKey}:${apiSecret}`;

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
        return this.withTokenRefresh(accessToken, async (validToken: string) => {
            const { apiKey, apiSecret } = await this.getApiCredentials();
            const xApiKey = `${apiKey}:${apiSecret}`;

            try {
                const response = await axios.get(`${this.baseUrl}/application/users/me`, {
                    headers: {
                        'x-api-key': xApiKey,
                        'Authorization': `Bearer ${validToken}`
                    }
                });
                return response.data;
            } catch (error: any) {
                console.error('Etsy Verify Connection Error:', error.response?.data || error.message);
                throw error;
            }
        });
    }
    /**
     * Create a new draft listing
     */
    async createDraftListing(shopId: string, accessToken: string, payload: EtsyCreateListingPayload) {
        return this.withTokenRefresh(accessToken, async (validToken: string) => {
            const { apiKey, apiSecret } = await this.getApiCredentials();
            const xApiKey = `${apiKey}:${apiSecret}`;

            try {
                // application/x-www-form-urlencoded is needed for Etsy POST requests
                const formData = new URLSearchParams();
                Object.entries(payload).forEach(([key, value]) => {
                    if (value !== undefined) {
                        if (Array.isArray(value)) {
                            formData.append(key, value.join(','));
                        } else {
                            formData.append(key, String(value));
                        }
                    }
                });

                const response = await axios.post(`${this.baseUrl}/application/shops/${shopId}/listings`, formData.toString(), {
                    headers: {
                        'x-api-key': xApiKey,
                        'Authorization': `Bearer ${validToken}`,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                });
                return response.data;
            } catch (error: any) {
                console.error('Etsy createDraftListing Error:', error.response?.data || error.message);
                throw error;
            }
        });
    }

    /**
     * Upload an image to an existing listing
     */
    async uploadListingImage(shopId: string, listingId: number, accessToken: string, imageUrl: string) {
        return this.withTokenRefresh(accessToken, async (validToken: string) => {
            const { apiKey, apiSecret } = await this.getApiCredentials();
            const xApiKey = `${apiKey}:${apiSecret}`;

            try {
                // Fetch the image from URL as stream
                const imageResponse = await axios.get(imageUrl, { responseType: 'stream' });

                const form = new FormData();
                form.append('image', imageResponse.data, 'product_image.jpg');

                const response = await axios.post(`${this.baseUrl}/application/shops/${shopId}/listings/${listingId}/images`, form, {
                    headers: {
                        'x-api-key': xApiKey,
                        'Authorization': `Bearer ${validToken}`,
                        ...form.getHeaders()
                    }
                });
                return response.data;
            } catch (error: any) {
                console.error(`Etsy uploadListingImage Error for Listing ${listingId}:`, error.response?.data || error.message);
                throw error;
            }
        });
    }

    /**
     * Update an existing listing properties (e.g. state to active, price, quantity)
     * 
     * For price updates: pass price as a number (e.g., 50.00)
     */
    async updateListing(shopId: string, listingId: number, accessToken: string, updates: any) {
        return this.withTokenRefresh(accessToken, async (validToken: string) => {
            const { apiKey, apiSecret } = await this.getApiCredentials();
            const xApiKey = `${apiKey}:${apiSecret}`;

            try {
                // Keep price as number for form-urlencoded format
                const payload = { ...updates };

                console.log(`[Etsy] PATCH Request Payload:`, JSON.stringify(payload, null, 2));

                // Convert payload to URLSearchParams for application/x-www-form-urlencoded
                const formData = new URLSearchParams();
                for (const [key, value] of Object.entries(payload)) {
                    if (Array.isArray(value)) {
                        formData.append(key, value.join(','));
                    } else {
                        formData.append(key, String(value));
                    }
                }

                const response = await axios.patch(
                    `${this.baseUrl}/application/shops/${shopId}/listings/${listingId}`,
                    formData.toString(),
                    {
                        headers: {
                            'x-api-key': xApiKey,
                            'Authorization': `Bearer ${validToken}`,
                            'Content-Type': 'application/x-www-form-urlencoded'
                        }
                    }
                );

                console.log(`[Etsy] PATCH Response Payload:`, JSON.stringify(response.data, null, 2));
                return response.data;
            } catch (error: any) {
                console.error(`Etsy updateListing Error for Listing ${listingId}:`, error.response?.data || error.message);
                throw error;
            }
        });
    }

    /**
     * Fetch all return policies for the shop
     */
    async getReturnPolicies(shopId: string, accessToken: string) {
        return this.withTokenRefresh(accessToken, async (validToken: string) => {
            const { apiKey, apiSecret } = await this.getApiCredentials();
            const xApiKey = `${apiKey}:${apiSecret}`;

            try {
                const response = await axios.get(`${this.baseUrl}/application/shops/${shopId}/policies/return`, {
                    headers: {
                        'x-api-key': xApiKey,
                        'Authorization': `Bearer ${validToken}`
                    }
                });
                return response.data;
            } catch (error: any) {
                console.error(`Etsy getReturnPolicies Error for Shop ${shopId}:`, error.response?.data || error.message);
                throw error;
            }
        });
    }

    /**
     * Fetch all shipping profiles for the shop
     */
    async getShippingProfiles(shopId: string, accessToken: string) {
        return this.withTokenRefresh(accessToken, async (validToken: string) => {
            const { apiKey, apiSecret } = await this.getApiCredentials();
            const xApiKey = `${apiKey}:${apiSecret}`;

            try {
                const response = await axios.get(`${this.baseUrl}/application/shops/${shopId}/shipping-profiles`, {
                    headers: {
                        'x-api-key': xApiKey,
                        'Authorization': `Bearer ${validToken}`
                    }
                });
                return response.data;
            } catch (error: any) {
                console.error(`Etsy getShippingProfiles Error for Shop ${shopId}:`, error.response?.data || error.message);
                throw error;
            }
        });
    }

    /**
     * Fetch all readiness state definitions (processing profiles) for the shop
     */
    async getReadinessStates(shopId: string, accessToken: string) {
        return this.withTokenRefresh(accessToken, async (validToken: string) => {
            const { apiKey, apiSecret } = await this.getApiCredentials();
            const xApiKey = `${apiKey}:${apiSecret}`;

            try {
                const response = await axios.get(`${this.baseUrl}/application/shops/${shopId}/readiness-state-definitions`, {
                    headers: {
                        'x-api-key': xApiKey,
                        'Authorization': `Bearer ${validToken}`
                    }
                });
                return response.data;
            } catch (error: any) {
                console.error(`Etsy getReadinessStates Error for Shop ${shopId}:`, error.response?.data || error.message);
                throw error;
            }
        });
    }

    /**
     * Fetch seller taxonomy nodes from Etsy API
     */
    async getSellerTaxonomyNodes() {
        // According to Etsy docs, this is a public endpoint but requires API key
        const { apiKey, apiSecret } = await this.getApiCredentials();
        const xApiKey = `${apiKey}:${apiSecret}`;

        try {
            const response = await axios.get(`${this.baseUrl}/application/seller-taxonomy/nodes`, {
                headers: {
                    'x-api-key': xApiKey
                }
            });
            return response.data;
        } catch (error: any) {
            console.error(`Etsy getSellerTaxonomyNodes Error:`, error.response?.data || error.message);
            throw new Error(`Failed to fetch Etsy seller taxonomy nodes: ${JSON.stringify(error.response?.data || error.message)}`);
        }
    }

    /**
     * Get listing inventory
     */
    async getListingInventory(listingId: number, accessToken: string) {
        return this.withTokenRefresh(accessToken, async (validToken: string) => {
            const { apiKey, apiSecret } = await this.getApiCredentials();
            const xApiKey = `${apiKey}:${apiSecret}`;

            try {
                const response = await axios.get(
                    `${this.baseUrl}/application/listings/${listingId}/inventory`,
                    {
                        headers: {
                            'x-api-key': xApiKey,
                            'Authorization': `Bearer ${validToken}`
                        }
                    }
                );
                return response.data;
            } catch (error: any) {
                console.error(`Etsy getListingInventory Error for Listing ${listingId}:`, error.response?.data || error.message);
                throw error;
            }
        });
    }

    /**
     * Update listing inventory (price, quantity, etc.)
     */
    async updateListingInventory(listingId: number, accessToken: string, inventoryData: any) {
        return this.withTokenRefresh(accessToken, async (validToken: string) => {
            const { apiKey, apiSecret } = await this.getApiCredentials();
            const xApiKey = `${apiKey}:${apiSecret}`;

            try {
                console.log(`[Etsy] PUT Inventory Request Payload:`, JSON.stringify(inventoryData, null, 2));

                const response = await axios.put(
                    `${this.baseUrl}/application/listings/${listingId}/inventory`,
                    inventoryData,
                    {
                        headers: {
                            'x-api-key': xApiKey,
                            'Authorization': `Bearer ${validToken}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );

                console.log(`[Etsy] PUT Inventory Response Payload:`, JSON.stringify(response.data, null, 2));
                return response.data;
            } catch (error: any) {
                console.error(`Etsy updateListingInventory Error for Listing ${listingId}:`, error.response?.data || error.message);
                throw error;
            }
        });
    }

    /**
     * Get shop receipts (orders) from Etsy
     * Etsy uses "receipts" for orders in their API
     * @param shopId  Etsy shop ID
     * @param accessToken  OAuth access token
     * @param options  Optional filters: min_created, max_created, status, limit, offset
     */
    async getShopReceipts(shopId: string, accessToken: string, options: {
        min_created?: number;
        max_created?: number;
        status?: string;
        limit?: number;
        offset?: number;
        was_paid?: boolean;
        was_shipped?: boolean;
    } = {}) {
        return this.withTokenRefresh(accessToken, async (validToken: string) => {
            const { apiKey, apiSecret } = await this.getApiCredentials();
            const xApiKey = `${apiKey}:${apiSecret}`;

            const params = new URLSearchParams();
            if (options.limit)       params.set('limit',        String(options.limit));
            if (options.offset)      params.set('offset',       String(options.offset));
            if (options.min_created) params.set('min_created',  String(options.min_created));
            if (options.max_created) params.set('max_created',  String(options.max_created));
            if (options.status)      params.set('status',       options.status);
            if (options.was_paid !== undefined) params.set('was_paid', String(options.was_paid));
            if (options.was_shipped !== undefined) params.set('was_shipped', String(options.was_shipped));

            const qs = params.toString() ? `?${params.toString()}` : '';

            try {
                const response = await axios.get(
                    `${this.baseUrl}/application/shops/${shopId}/receipts${qs}`,
                    {
                        headers: {
                            'x-api-key': xApiKey,
                            'Authorization': `Bearer ${validToken}`
                        }
                    }
                );
                // response.data = { count, results: [...] }
                return response.data;
            } catch (error: any) {
                console.error(`Etsy getShopReceipts Error for Shop ${shopId}:`, error.response?.data || error.message);
                throw error;
            }
        });
    }

    /**
     * Get a single shop receipt (order) by receipt ID
     */
    async getShopReceipt(shopId: string, receiptId: number, accessToken: string) {
        return this.withTokenRefresh(accessToken, async (validToken: string) => {
            const { apiKey, apiSecret } = await this.getApiCredentials();
            const xApiKey = `${apiKey}:${apiSecret}`;

            try {
                const response = await axios.get(
                    `${this.baseUrl}/application/shops/${shopId}/receipts/${receiptId}`,
                    {
                        headers: {
                            'x-api-key': xApiKey,
                            'Authorization': `Bearer ${validToken}`
                        }
                    }
                );
                return response.data;
            } catch (error: any) {
                console.error(`Etsy getShopReceipt Error for Receipt ${receiptId}:`, error.response?.data || error.message);
                throw error;
            }
        });
    }
}

export default EtsyClient;

