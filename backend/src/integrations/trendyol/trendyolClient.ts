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
     * Verify connection by fetching seller info
     */
    async verifyConnection(sellerId: string): Promise<{ success: boolean; sellerName?: string }> {
        try {
            await this.client.get(`/addresses`);
            return { success: true, sellerName: `Trendyol Satıcısı (${sellerId})` };
        } catch (error: any) {
            console.error('[Trendyol] verifyConnection error:', error.response?.data || error.message);
            throw new Error(`Trendyol bağlantı hatası: ${error.response?.data?.message || error.message}`);
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
