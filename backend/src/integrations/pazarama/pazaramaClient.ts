import axios, { AxiosInstance } from 'axios';
import qs from 'qs';
import { attachApiLogger } from '../../utils/apiLogger';

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

export interface PazaramaCategory {
    id: string;
    name: string;
    parentId?: string;
    hasChildren: boolean;
}

export interface PazaramaBrand {
    id: string;
    name: string;
}

export interface PazaramaProductCreateInput {
    name: string;
    description: string;
    brandId: string;
    categoryId: string;
    stockCode: string;
    barcode?: string;
    stockCount: number;
    salePrice: number;
    listPrice: number;
    vatRate: number;
    images: string[];
    attributes?: Record<string, string>;
}

export class PazaramaClient {
    private apiBaseUrl = 'https://isortagimapi.pazarama.com';
    private authUrl = 'https://isortagimgiris.pazarama.com/connect/token';
    private client: AxiosInstance;
    private clientId: string;
    private clientSecret: string;
    private accessToken: string | null = null;
    private tokenExpiresAt: number = 0;

    constructor(clientId: string, clientSecret: string, userId?: string) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.client = axios.create({
            baseURL: this.apiBaseUrl,
            timeout: 20000
        });
        attachApiLogger(this.client, userId, 'pazarama');

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
            const data = qs.stringify({
                grant_type: 'client_credentials',
                client_id: this.clientId,
                client_secret: this.clientSecret,
                scope: 'merchantgatewayapi.fullaccess'
            });

            const response = await axios.post(this.authUrl, data, {
                headers: {
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
            await this.client.get('/api/Product/GetBrandList?page=1&size=1');
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
            const response = await this.client.post('/api/Product/UpdatePrice-v2', items);
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
            const response = await this.client.post('/api/Product/UpdateStock-v2', items);
            const batchId = response.data?.batchId || response.data?.batchRequestId || '';
            console.log(`[Pazarama] STOCK UPDATE submitted for ${items.length} item(s). Batch: ${batchId}`);
        } catch (error: any) {
            const errMsg = error.response?.data?.message || error.message;
            console.error('[Pazarama] updateStock error:', errMsg);
            throw new Error(`Pazarama stok güncelleme hatası: ${errMsg}`);
        }
    }

    /**
     * Get category tree
     */
    async getCategories(): Promise<PazaramaCategory[]> {
        try {
            const response = await this.client.get('/api/Product/GetCategoryTree');
            return response.data?.data || [];
        } catch (error: any) {
            console.error('[Pazarama] getCategories error:', error.response?.data || error.message);
            throw new Error(`Pazarama kategori alma hatası: ${error.message}`);
        }
    }

    /**
     * Get brand list
     */
    async getBrands(page = 1, size = 100): Promise<PazaramaBrand[]> {
        try {
            const response = await this.client.get('/api/Product/GetBrandList', {
                params: { page, size }
            });
            return response.data?.data || [];
        } catch (error: any) {
            console.error('[Pazarama] getBrands error:', error.response?.data || error.message);
            throw new Error(`Pazarama marka alma hatası: ${error.message}`);
        }
    }

    /**
     * Get category attributes
     */
    async getCategoryAttributes(categoryId: string): Promise<any[]> {
        try {
            const response = await this.client.get('/api/Product/GetCategoryAttributes', {
                params: { categoryId }
            });
            return response.data?.data || [];
        } catch (error: any) {
            console.error('[Pazarama] getCategoryAttributes error:', error.response?.data || error.message);
            throw new Error(`Pazarama kategori özellikleri alma hatası: ${error.message}`);
        }
    }

    /**
     * Create product on Pazarama
     */
    async createProduct(input: PazaramaProductCreateInput): Promise<string> {
        try {
            const productData = {
                products: [{
                    name: input.name,
                    description: input.description,
                    brandId: input.brandId,
                    categoryId: input.categoryId,
                    stockCode: input.stockCode,
                    barcode: input.barcode,
                    stockCount: input.stockCount,
                    salePrice: input.salePrice,
                    listPrice: input.listPrice,
                    vatRate: input.vatRate,
                    images: input.images.slice(0, 5).map(url => ({ url })),
                    attributes: Object.entries(input.attributes || {}).map(([key, value]) => ({
                        attributeName: key,
                        attributeValue: value
                    }))
                }]
            };

            const response = await this.client.post('/api/Product/InsertProduct-v2', productData);
            const batchId = response.data?.batchId || response.data?.batchRequestId || '';
            console.log(`[Pazarama] Product created. Batch: ${batchId}`);
            return batchId;
        } catch (error: any) {
            const errMsg = error.response?.data?.message || error.message;
            console.error('[Pazarama] createProduct error:', errMsg);
            throw new Error(`Pazarama ürün oluşturma hatası: ${errMsg}`);
        }
    }

    /**
     * Update product
     */
    async updateProduct(input: Partial<PazaramaProductCreateInput> & { stockCode: string }): Promise<void> {
        try {
            await this.client.post('/api/Product/UpdateProduct-v2', {
                products: [input]
            });
            console.log(`[Pazarama] Product updated: ${input.stockCode}`);
        } catch (error: any) {
            const errMsg = error.response?.data?.message || error.message;
            console.error('[Pazarama] updateProduct error:', errMsg);
            throw new Error(`Pazarama ürün güncelleme hatası: ${errMsg}`);
        }
    }

    /**
     * Get product list
     */
    async getProducts(page = 1, size = 50): Promise<any[]> {
        try {
            const response = await this.client.get('/api/Product/GetProductList', {
                params: { page, size }
            });
            return response.data?.data || [];
        } catch (error: any) {
            console.error('[Pazarama] getProducts error:', error.message);
            return [];
        }
    }

    /**
     * Delete product
     */
    async deleteProduct(stockCode: string): Promise<void> {
        try {
            await this.client.post('/api/Product/DeleteProduct', {
                stockCodes: [stockCode]
            });
            console.log(`[Pazarama] Product deleted: ${stockCode}`);
        } catch (error: any) {
            console.error('[Pazarama] deleteProduct error:', error.message);
            throw new Error(`Pazarama ürün silme hatası: ${error.message}`);
        }
    }
}

export default PazaramaClient;
