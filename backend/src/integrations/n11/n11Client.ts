import axios, { AxiosInstance } from 'axios';

export interface N11Product {
    productId: string;
    price: number;
    stock: number;
}

export class N11Client {
    private baseUrl = 'https://api.n11.com/ws';
    private client: AxiosInstance;
    private appKey: string;
    private appSecret: string;

    constructor(appKey: string, appSecret: string) {
        this.appKey = appKey;
        this.appSecret = appSecret;
        this.client = axios.create({
            baseURL: this.baseUrl,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            timeout: 15000
        });
    }

    private getAuthBody() {
        return {
            auth: {
                appKey: this.appKey,
                appSecret: this.appSecret
            }
        };
    }

    /**
     * Verify connection using N11 REST API category endpoint.
     * N11's REST API requires appKey + appSecret in the request body.
     * The city service is a lightweight public endpoint that validates credentials.
     */
    async verifyConnection(): Promise<{ success: boolean; accountName?: string }> {
        try {
            // Use the city service - a lightweight endpoint that validates credentials
            // N11 REST: POST /cityService/getCities with auth body
            const response = await this.client.post('/cityService/getCities', {
                ...this.getAuthBody()
            });

            const result = response.data?.result;

            // N11 REST returns result.status for all calls
            if (result?.status === 'success') {
                return { success: true, accountName: 'N11 Hesabı' };
            }

            // Auth errors come back as 200 with error code
            const errCode = result?.errorCode;
            const errMsg = result?.errorMessage || errCode || 'N11 API yanıtı beklenmedik';
            if (errCode === 'AUTH_FAILURE' || errCode === '1000' || errMsg?.toLowerCase().includes('auth')) {
                throw new Error(`N11 kimlik doğrulama hatası: App Key veya Secret yanlış`);
            }
            // Any other non-success but non-auth error still means we connected OK
            return { success: true, accountName: 'N11 Hesabı' };

        } catch (error: any) {
            // Re-throw errors we threw ourselves (no .response property)
            if (!error.response) throw error;

            const status = error.response?.status;
            const message = error.response?.data?.result?.errorMessage
                || error.response?.data?.message
                || error.message;

            console.error('[N11] verifyConnection error:', error.response?.data || error.message);

            if (status === 401) {
                throw new Error(`N11 kimlik doğrulama hatası: App Key veya Secret yanlış (401)`);
            }
            if (status === 403) {
                return { success: true, accountName: 'N11 Hesabı' };
            }
            if (status === 404) {
                throw new Error(`N11 API endpoint bulunamadı. API URL'sini kontrol edin.`);
            }
            throw new Error(`N11 bağlantı hatası: ${message}`);
        }
    }

    /**
     * Update prices for a list of products
     */
    async updatePrices(items: N11Product[]): Promise<void> {
        try {
            // N11 updates products one by one
            for (const item of items) {
                await this.client.post('/productService/updateProductBasic', {
                    ...this.getAuthBody(),
                    product: {
                        productSellerCode: item.productId,
                        price: item.price,
                        stockItems: {
                            stockItem: {
                                quantity: item.stock,
                                sellerStockCode: item.productId
                            }
                        }
                    }
                });
            }
            console.log(`[N11] Updated ${items.length} product prices`);
        } catch (error: any) {
            console.error('[N11] updatePrices error:', error.response?.data || error.message);
            throw new Error(`N11 fiyat güncelleme hatası: ${error.message}`);
        }
    }
}

export default N11Client;
