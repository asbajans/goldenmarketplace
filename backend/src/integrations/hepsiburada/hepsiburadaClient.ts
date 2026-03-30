import axios, { AxiosInstance } from 'axios';
import { attachApiLogger } from '../../utils/apiLogger';

export interface HepsiburadaProduct {
    sku: string; // Merchant SKU
    listingId?: string;
    price: number;
    stock: number;
}

export class HepsiburadaClient {
    private listingBaseUrl = 'https://listing-external.hepsiburada.com';
    private client: AxiosInstance;
    private merchantId: string;

    constructor(username: string, password: string, merchantId: string, userId?: string) {
        const credentials = Buffer.from(`${username}:${password}`).toString('base64');
        this.merchantId = merchantId;
        this.client = axios.create({
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            timeout: 15000
        });
        attachApiLogger(this.client, userId, 'hepsiburada');
    }

    /**
     * Verify connection by fetching listings
     */
    async verifyConnection(): Promise<{ success: boolean; merchantId: string }> {
        try {
            // List first page of listings to verify credentials work
            await this.client.get(
                `${this.listingBaseUrl}/listings/merchantid/${this.merchantId}?limit=1&offset=0`
            );
            return { success: true, merchantId: this.merchantId };
        } catch (error: any) {
            console.error('[Hepsiburada] verifyConnection error:', error.response?.data || error.message);
            throw new Error(`Hepsiburada bağlantı hatası: ${error.response?.status === 401 ? 'Yanlış kimlik bilgileri' : error.message}`);
        }
    }

    /**
     * Update prices for a list of products
     */
    async updatePrices(items: HepsiburadaProduct[]): Promise<void> {
        try {
            // Hepsiburada updates prices one by one or in batch listing update
            const payload = items.map(item => ({
                merchantSku: item.sku,
                price: item.price,
                availableStock: item.stock
            }));

            await this.client.post(
                `${this.listingBaseUrl}/listings/merchantid/${this.merchantId}/stock-uploads`,
                { listings: payload }
            );

            console.log(`[Hepsiburada] Updated ${items.length} product prices`);
        } catch (error: any) {
            console.error('[Hepsiburada] updatePrices error:', error.response?.data || error.message);
            throw new Error(`Hepsiburada fiyat güncelleme hatası: ${error.message}`);
        }
    }
}

export default HepsiburadaClient;
