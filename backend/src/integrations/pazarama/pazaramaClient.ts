import axios, { AxiosInstance } from 'axios';
import qs from 'qs';

export interface PazaramaCreateProductItem {
    name: string;
    description: string;
    brandId: string;
    categoryId: string;
    stockCode: string; // SKU / Barcode
    stockCount: number;
    salePrice: number;
    listPrice: number;
    vatRate: number;
    images: { url: string }[];
    attributes: { name: string; value: string }[];
}

export interface PazaramaPriceUpdateItem {
    code: string; // barcode
    listPrice: number;
    salePrice: number;
}

export interface PazaramaStockUpdateItem {
    code: string;
    stockCount: number;
}

export class PazaramaClient {
    private apiBaseUrl = 'https://isortagimapi.pazarama.com';
    private authUrl = 'https://isortagimgiris.pazarama.com/connect/token';
    private client: AxiosInstance;
    private clientId: string;
    private clientSecret: string;
    private accessToken: string | null = null;
    private tokenExpiresAt: number = 0;

    constructor(clientId: string, clientSecret: string) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.client = axios.create({
            baseURL: this.apiBaseUrl,
            timeout: 20000
        });

        // Add request interceptor to attach token
        this.client.interceptors.request.use(async (config) => {
            const token = await this.getToken();
            // @ts-ignore
            config.headers = config.headers || {};
            config.headers.Authorization = `Bearer ${token}`;
            return config;
        });
    }

    private async getToken(): Promise<string> {
        if (this.accessToken && Date.now() < this.tokenExpiresAt) {
            return this.accessToken;
        }

        try {
            const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
            const data = qs.stringify({
                grant_type: 'client_credentials',
                scope: 'merchantgatewayapi.fullaccess'
            });

            const response = await axios.post(this.authUrl, data, {
                headers: {
                    'Authorization': `Basic ${credentials}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            this.accessToken = response.data.access_token;
            const expiresIn = response.data.expires_in || 3600;
            // Subtract 60 seconds buffer
            this.tokenExpiresAt = Date.now() + (expiresIn - 60) * 1000;

            return this.accessToken!;
        } catch (error: any) {
            console.error('[Pazarama] getToken error:', error.response?.data || error.message);
            throw new Error(`Pazarama yetkilendirme hatası: Token alınamadı. Kimlik bilgilerinizi kontrol edin.`);
        }
    }

    /**
     * Verify connection using a lightweight endpoint (brandlist)
     */
    async verifyConnection(): Promise<{ success: boolean; accountName?: string }> {
        try {
            await this.client.get('/product/brandlist?page=1&size=1');
            return { success: true, accountName: 'Pazarama Hesabı' };
        } catch (error: any) {
            if (error.response?.status === 401 || error.message.includes('Token')) {
                throw new Error(`Pazarama kimlik doğrulama hatası: Client ID veya Secret yanlış`);
            }
            throw new Error(`Pazarama bağlantı hatası: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * Update prices for existing products
     */
    async updatePrices(items: PazaramaPriceUpdateItem[]): Promise<void> {
        if (!items || items.length === 0) return;
        try {
            const response = await this.client.post('/product/updatePrice-v2', items);
            const batchId = response.data?.batchId || response.data?.batchRequestId || '';
            console.log(`[Pazarama] PRICE UPDATE submitted for ${items.length} item(s). Batch: ${batchId}`);
        } catch (error: any) {
            const errMsg = error.response?.data?.message || error.message;
            console.error('[Pazarama] updatePrices error:', errMsg);
            throw new Error(`Pazarama fiyat güncelleme hatası: ${errMsg}`);
        }
    }

    /**
     * Update stock for existing products
     */
    async updateStock(items: PazaramaStockUpdateItem[]): Promise<void> {
        if (!items || items.length === 0) return;
        try {
            const response = await this.client.post('/product/updateStock-v2', items);
            const batchId = response.data?.batchId || response.data?.batchRequestId || '';
            console.log(`[Pazarama] STOCK UPDATE submitted for ${items.length} item(s). Batch: ${batchId}`);
        } catch (error: any) {
            const errMsg = error.response?.data?.message || error.message;
            console.error('[Pazarama] updateStock error:', errMsg);
            throw new Error(`Pazarama stok güncelleme hatası: ${errMsg}`);
        }
    }
}

export default PazaramaClient;
