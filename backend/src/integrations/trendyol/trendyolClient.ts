import axios, { AxiosInstance } from 'axios';
import { attachApiLogger } from '../../utils/apiLogger';

export interface TrendyolCreateProductItem {
    barcode: string;          // SKU — unique identifier
    title: string;
    productMainId: string;    // Seller's own product code (can be same as barcode)
    stockCode: string;        // Same as barcode
    description: string;
    categoryId: number;       // Trendyol category ID
    brandId: number;          // Trendyol brand ID
    listPrice: number;        // List price (higher)
    salePrice: number;        // Sale price
    vatRate: number;          // KDV: 10 or 20
    quantity: number;
    images: { url: string }[];
    attributes?: { attributeId: number; attributeValueId: number }[];
}

export interface TrendyolPriceUpdateItem {
    barcode: string;
    listPrice: number;
    salePrice: number;
    quantity: number;
}

export class TrendyolClient {
    private baseUrl = 'https://api.trendyol.com/sapigw';
    private client: AxiosInstance;
    private sellerId: string;

    constructor(apiKey: string, apiSecret: string, sellerId: string, userId?: string) {
        this.sellerId = sellerId;
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

        attachApiLogger(this.client, userId, 'trendyol');
    }

    /**
     * Verify connection — 401 = bad credentials, 403 = auth OK but no permission (treat as success)
     */
    async verifyConnection(_sellerId: string): Promise<{ success: boolean; sellerName?: string }> {
        try {
            await this.client.get(`/addresses`);
            return { success: true, sellerName: `Trendyol Satici (${this.sellerId})` };
        } catch (error: any) {
            const status = error.response?.status;
            if (status === 401) {
                return Promise.reject(new Error(`Trendyol kimlik dogrulama hatasi: API Key veya Secret yanlis (401)`));
            }
            if (status === 403) {
                return { success: true, sellerName: `Trendyol Satici (${this.sellerId})` };
            }
            return Promise.reject(new Error(`Trendyol baglanti hatasi: ${error.response?.data?.message || error.message}`));
        }
    }

    /**
     * Create new products on Trendyol.
     * POST /suppliers/{supplierId}/v2/products
     * Returns batchRequestId for tracking.
     */
    async createProducts(items: TrendyolCreateProductItem[]): Promise<string> {
        if (!items || items.length === 0) return '';
        try {
            const response = await this.client.post(`/v2/products`, { items });
            const batchRequestId = response.data.batchRequestId || response.data.batchId || '';
            console.log(`[Trendyol] CREATE submitted for ${items.length} product(s). Batch: ${batchRequestId}`);
            return batchRequestId;
        } catch (error: any) {
            const errMsg = error.response?.data?.errors?.[0]?.message ||
                error.response?.data?.message ||
                JSON.stringify(error.response?.data) ||
                error.message;
            console.error('[Trendyol] createProducts error:', errMsg);
            throw new Error(`Trendyol urun olusturma hatasi: ${errMsg}`);
        }
    }

    /**
     * Update prices and inventory for existing products.
     * PUT /suppliers/{supplierId}/products/price-and-inventory
     */
    async updatePrices(items: TrendyolPriceUpdateItem[]): Promise<void> {
        if (!items || items.length === 0) return;
        try {
            const response = await this.client.post(`/products/price-and-inventory`, { items });
            const batchRequestId = response.data.batchRequestId || response.data.batchId;
            console.log(`[Trendyol] PRICE UPDATE submitted. Batch: ${batchRequestId}`);
            if (batchRequestId) {
                await new Promise(resolve => setTimeout(resolve, 3000));
                await this.pollBatchRequestResult(batchRequestId);
            }
        } catch (error: any) {
            const errMsg = error.response?.data?.errors?.[0]?.message ||
                error.response?.data?.message ||
                error.message;
            throw new Error(`Trendyol fiyat guncelleme hatasi: ${errMsg}`);
        }
    }

    /**
     * Poll batch request status.
     * 403 on this endpoint = no permission, but price update was accepted — non-fatal.
     */
    async pollBatchRequestResult(batchRequestId: string, retries = 3, delayMs = 3000): Promise<void> {
        for (let i = 0; i < retries; i++) {
            try {
                const response = await this.client.get(`/products/batch-requests/${batchRequestId}`);
                const status = response.data.status;

                if (status === 'COMPLETED') {
                    const items = response.data.items || [];
                    const failedItems = items.filter((item: any) => item.status === 'FAILED');
                    if (failedItems.length > 0) {
                        const errorMessages = failedItems.map((item: any) => {
                            const barcode = item.requestItem?.barcode || item.barcode || 'Bilinmiyor';
                            const reasons = item.failureReasons?.join(', ') || 'Bilinmeyen hata';
                            return `Barkod ${barcode}: ${reasons}`;
                        }).join(' | ');
                        throw new Error(`Hatali urunler: ${errorMessages}`);
                    }
                    console.log(`[Trendyol] Batch ${batchRequestId} COMPLETED.`);
                    return;
                }

                if (status === 'FAILED') {
                    throw new Error(`Islem basarisiz (Batch ${batchRequestId}).`);
                }

                await new Promise(resolve => setTimeout(resolve, delayMs));

            } catch (err: any) {
                if (err.response?.status === 403) {
                    console.warn(`[Trendyol] Batch ${batchRequestId}: poll 403 — update was accepted.`);
                    return;
                }
                if (err.message?.includes('Hatali urunler') || err.message?.includes('Islem basarisiz')) {
                    throw err;
                }
                if (i === retries - 1) {
                    console.warn(`[Trendyol] Could not confirm batch ${batchRequestId}. Update was accepted.`);
                    return;
                }
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
    }
}

export default TrendyolClient;
