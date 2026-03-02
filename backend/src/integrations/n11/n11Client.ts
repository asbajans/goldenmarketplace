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
     * Verify connection by getting account info
     */
    async verifyConnection(): Promise<{ success: boolean; accountName?: string }> {
        try {
            const response = await this.client.post('/accountService/account/list', {
                ...this.getAuthBody(),
                pagingData: { currentPage: 0, pageSize: 1 }
            });

            // N11 returns result.status === 'success' on successful API calls
            if (response.data?.result?.status === 'success') {
                return { success: true, accountName: 'N11 Hesabı' };
            }
            throw new Error(response.data?.result?.errorMessage || 'N11 API yanıtı beklenmedik');
        } catch (error: any) {
            console.error('[N11] verifyConnection error:', error.response?.data || error.message);
            throw new Error(`N11 bağlantı hatası: ${error.message}`);
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
