import axios, { AxiosInstance } from 'axios';

export interface TrendyolProduct {
    barcode: string;
    listPrice: number;
    salePrice: number;
    quantity: number;
}

export class TrendyolClient {
    private baseUrl = 'https://api.trendyol.com/sapigw';
    private client: AxiosInstance;

    constructor(apiKey: string, apiSecret: string, sellerId: string) {
        const credentials = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
        this.client = axios.create({
            baseURL: `${this.baseUrl}/suppliers/${sellerId}`,
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/json',
                'User-Agent': `${sellerId} - SelfIntegration`
            },
            timeout: 15000
        });
    }

    /**
     * Verify connection by fetching brand list (public catalog endpoint)
     */
    async verifyConnection(sellerId: string): Promise<{ success: boolean; sellerName?: string }> {
        try {
            // /addresses verifies credentials; 403 means auth works but no permission (still a success)
            await this.client.get(`/addresses`);
            return { success: true, sellerName: `Trendyol Satıcısı (${sellerId})` };
        } catch (error: any) {
            const status = error.response?.status;
            const message = error.response?.data?.message || error.response?.data?.errors?.[0]?.message || error.message;
            console.error('[Trendyol] verifyConnection error:', error.response?.data || error.message);
            // 401 = bad credentials, 403 = no permission but auth worked
            if (status === 401) {
                throw new Error(`Trendyol kimlik doğrulama hatası: API Key veya Secret yanlış (401)`);
            }
            if (status === 403) {
                // 403 means credentials are VALID but no permission for this endpoint - treat as success
                return { success: true, sellerName: `Trendyol Satıcısı (${sellerId})` };
            }
            throw new Error(`Trendyol bağlantı hatası: ${message}`);
        }
    }

    /**
     * Update prices and inventory for a list of products
     */
    async updatePrices(items: TrendyolProduct[]): Promise<void> {
        try {
            const payload = {
                items: items.map(item => ({
                    barcode: item.barcode,
                    listPrice: item.listPrice,
                    salePrice: item.salePrice,
                    quantity: item.quantity
                }))
            };
            await this.client.post(`/products/price-and-inventory`, payload);
            console.log(`[Trendyol] Updated ${items.length} product prices`);
        } catch (error: any) {
            console.error('[Trendyol] updatePrices error:', error.response?.data || error.message);
            throw new Error(`Trendyol fiyat güncelleme hatası: ${error.response?.data?.message || error.message}`);
        }
    }
}

export default TrendyolClient;
