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
     * Verify connection by fetching addresses endpoint
     * 401 = bad credentials, 403 = auth works but no permission (treat as success)
     */
    async verifyConnection(sellerId: string): Promise<{ success: boolean; sellerName?: string }> {
        try {
            await this.client.get(`/addresses`);
            return { success: true, sellerName: `Trendyol Satıcısı (${sellerId})` };
        } catch (error: any) {
            const status = error.response?.status;
            const message = error.response?.data?.message || error.response?.data?.errors?.[0]?.message || error.message;
            console.error('[Trendyol] verifyConnection error:', error.response?.data || error.message);
            if (status === 401) {
                throw new Error(`Trendyol kimlik doğrulama hatası: API Key veya Secret yanlış (401)`);
            }
            if (status === 403) {
                // 403 = credentials valid but no permission for this endpoint — treat as success
                return { success: true, sellerName: `Trendyol Satıcısı (${sellerId})` };
            }
            throw new Error(`Trendyol bağlantı hatası: ${message}`);
        }
    }

    /**
     * Update prices and inventory for a list of products.
     * Submits batch update and polls the batch status to detect item-level failures.
     */
    async updatePrices(items: TrendyolProduct[]): Promise<void> {
        if (!items || items.length === 0) return;

        try {
            const payload = {
                items: items.map(item => ({
                    barcode: item.barcode,
                    listPrice: item.listPrice,
                    salePrice: item.salePrice,
                    quantity: item.quantity
                }))
            };
            const response = await this.client.post(`/products/price-and-inventory`, payload);
            const batchRequestId = response.data.batchRequestId || response.data.batchId;
            console.log(`[Trendyol] Price update accepted. Batch ID: ${batchRequestId}`);

            if (batchRequestId) {
                // Brief wait then poll for results
                await new Promise(resolve => setTimeout(resolve, 3000));
                await this.pollBatchRequestResult(batchRequestId);
            }
        } catch (error: any) {
            console.error('[Trendyol] updatePrices error:', error.response?.data || error.message);
            throw new Error(`Trendyol fiyat güncelleme hatası: ${error.response?.data?.message || JSON.stringify(error.response?.data?.errors) || error.message}`);
        }
    }

    /**
     * Poll batch request status to check for item-level failures.
     *
     * NOTE: Some Trendyol seller accounts return 403 on this GET endpoint.
     * This means the seller plan lacks permission to query batch status.
     * Since the POST returned 200/201 (accepted), we treat 403 here as non-fatal.
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
                        throw new Error(`Hatalı ürünler: ${errorMessages}`);
                    }

                    console.log(`[Trendyol] Batch ${batchRequestId} COMPLETED successfully.`);
                    return;
                }

                if (status === 'FAILED') {
                    throw new Error(`İşlem başarısız (Batch ${batchRequestId}). Trendyol panelinden kontrol ediniz.`);
                }

                // IN_PROGRESS -> wait and retry
                await new Promise(resolve => setTimeout(resolve, delayMs));

            } catch (err: any) {
                // 403 = no permission to poll batch status, but the price update was accepted — non-fatal
                if (err.response?.status === 403) {
                    console.warn(`[Trendyol] Batch ${batchRequestId}: poll returned 403 (no status permission). Price update was accepted.`);
                    return;
                }
                // Re-throw explicit business errors
                if (err.message?.includes('Hatalı ürünler') || err.message?.includes('İşlem başarısız')) {
                    throw err;
                }
                console.warn(`[Trendyol] pollBatchRequestResult attempt ${i + 1} failed:`, err.message);
                if (i === retries - 1) {
                    // Non-fatal on last attempt — update was accepted by Trendyol
                    console.warn(`[Trendyol] Could not confirm batch status (${batchRequestId}). Update was accepted.`);
                    return;
                }
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
    }
}

export default TrendyolClient;
