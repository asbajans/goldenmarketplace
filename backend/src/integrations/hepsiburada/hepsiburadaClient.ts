import axios, { AxiosInstance } from 'axios';
import { attachApiLogger } from '../../utils/apiLogger';

export interface HepsiburadaProduct {
    sku: string; // Merchant SKU
    listingId?: string;
    price: number;
    stock: number;
}

export interface HepsiburadaCreateProductInput {
    categoryId: number;
    merchantSku: string;
    title: string;
    description?: string;
    barcode?: string;
    brand?: string;
    warrantyPeriod?: number; // months
    price: number;
    stock: number;
    images: string[];
    attributes?: Record<string, string>;
}

export interface HepsiburadaCategory {
    categoryId: number;
    name: string;
    parentCategoryId?: number;
    leaf: boolean;
    available: boolean;
}

export interface HepsiburadaCategoryAttribute {
    name: string;
    id: string;
    mandatory: boolean;
    type: 'String' | 'Enum';
    multiValue: boolean;
    values?: Array<{ id: string; value: string }>;
}

export class HepsiburadaClient {
    private listingBaseUrl = 'https://listing-external.hepsiburada.com';
    private catalogBaseUrl = 'https://catalog-external.hepsiburada.com';
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

    /**
     * Get categories from Hepsiburada
     */
    async getCategories(leafOnly = true, status = 'ACTIVE', available = true): Promise<HepsiburadaCategory[]> {
        try {
            const response = await this.client.get(
                `${this.catalogBaseUrl}/categories`,
                {
                    params: {
                        leaf: leafOnly,
                        status,
                        available,
                        size: 2000
                    }
                }
            );
            return response.data?.data || [];
        } catch (error: any) {
            console.error('[Hepsiburada] getCategories error:', error.response?.data || error.message);
            throw new Error(`Hepsiburada kategori alma hatası: ${error.message}`);
        }
    }

    /**
     * Get category attributes
     */
    async getCategoryAttributes(categoryId: number): Promise<HepsiburadaCategoryAttribute[]> {
        try {
            const response = await this.client.get(
                `${this.catalogBaseUrl}/categories/${categoryId}/attributes`
            );
            return response.data?.data || [];
        } catch (error: any) {
            console.error('[Hepsiburada] getCategoryAttributes error:', error.response?.data || error.message);
            throw new Error(`Hepsiburada kategori özellikleri alma hatası: ${error.message}`);
        }
    }

    /**
     * Create product on Hepsiburada via catalog integration
     * Sends product for review, returns tracking ID
     */
    async createProduct(input: HepsiburadaCreateProductInput): Promise<string> {
        try {
            const productData = {
                categoryId: input.categoryId,
                merchant: this.merchantId,
                attributes: input.attributes || {},
                merchantSku: input.merchantSku,
                title: input.title,
                description: input.description || input.title,
                barcode: input.barcode,
                brand: input.brand,
                warrantyPeriod: input.warrantyPeriod || 0,
                price: input.price.toString(),
                stock: input.stock.toString(),
                images: input.images.slice(0, 5).map((url, idx) => ({
                    [`Image${idx + 1}`]: url
                }))
            };

            // For catalog integration, we need to upload a JSON file
            // This is a simplified version - in production you'd use file upload
            const jsonContent = JSON.stringify([productData]);
            
            // Upload to catalog - returns tracking ID
            const response = await this.client.post(
                `${this.catalogBaseUrl}/products`,
                jsonContent,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            const trackingId = response.data?.trackingId || response.data?.data?.trackingId;
            console.log(`[Hepsiburada] Product submitted. Tracking ID: ${trackingId}`);
            return trackingId;
        } catch (error: any) {
            console.error('[Hepsiburada] createProduct error:', error.response?.data || error.message);
            throw new Error(`Hepsiburada ürün oluşturma hatası: ${error.message}`);
        }
    }

    /**
     * Get product status by tracking ID
     */
    async getProductStatus(trackingId: string): Promise<{
        status: string;
        items: Array<{
            merchantSku: string;
            productStatus: string;
            errors?: string[];
        }>;
    }> {
        try {
            const response = await this.client.get(
                `${this.catalogBaseUrl}/products/status`,
                { params: { trackingId } }
            );
            return {
                status: response.data?.importStatus || 'UNKNOWN',
                items: response.data?.data || []
            };
        } catch (error: any) {
            console.error('[Hepsiburada] getProductStatus error:', error.message);
            return { status: 'ERROR', items: [] };
        }
    }

    /**
     * Delete product from catalog
     */
    async deleteProduct(merchantSku: string): Promise<void> {
        try {
            await this.client.delete(
                `${this.catalogBaseUrl}/products`,
                { data: { merchantSku, merchant: this.merchantId } }
            );
            console.log(`[Hepsiburada] Product deleted: ${merchantSku}`);
        } catch (error: any) {
            console.error('[Hepsiburada] deleteProduct error:', error.message);
            throw new Error(`Hepsiburada ürün silme hatası: ${error.message}`);
        }
    }
}

export default HepsiburadaClient;
