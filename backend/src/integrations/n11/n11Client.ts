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
     * Verify connection by calling the N11 account service
     * N11 REST API: POST with JSON body containing auth credentials
     */
    async verifyConnection(): Promise<{ success: boolean; accountName?: string }> {
        try {
            const response = await this.client.post('/accountService/account/list', {
                ...this.getAuthBody(),
                pagingData: { currentPage: 0, pageSize: 1 }
            });

            const result = response.data?.result;
            // N11 returns result.status === 'success' on successful API calls
            if (result?.status === 'success') {
                return { success: true, accountName: 'N11 Hesabı' };
            }

            // Some auth errors are returned as 200 with error body
            const errorMsg = result?.errorMessage || result?.errorCode || 'N11 API yanıtı beklenmedik';
            if (result?.errorCode === 'AUTH_FAILURE' || result?.errorCode === '0000') {
                throw new Error(`N11 kimlik doğrulama hatası: App Key veya Secret yanlış`);
            }
            throw new Error(errorMsg);
        } catch (error: any) {
            // If it's already our thrown error, rethrow
            if (!error.response) throw error;

            const status = error.response?.status;
            const message = error.response?.data?.result?.errorMessage || error.response?.data?.message || error.message;
            console.error('[N11] verifyConnection error:', error.response?.data || error.message);

            if (status === 401) {
                throw new Error(`N11 kimlik doğrulama hatası: App Key veya Secret yanlış (401)`);
            }
            if (status === 403) {
                // Credentials valid but limited permission - treat as success
                return { success: true, accountName: 'N11 Hesabı' };
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
                        productId: item.productId,
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
