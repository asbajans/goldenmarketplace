import client from './client';

export interface Product {
    id: string;
    title: string;
    description: string;
    gramWeight: number;
    milyem: number;
    effectiveMilyem?: number;
    gramHas?: number;
    profitMargin: number;
    priceTRY: number;
    priceUSD: number;
    quantity: number;
    category: string;
    sku: string;
    images?: string[];
    videoUrl?: string;
    marketplaces?: string[];
    tags?: string[];
    originalStoreName?: string;
    originalProductId?: string;
    isActive: boolean;
}

export const getProducts = async () => {
    const response = await client.get('/products');
    return response.data.data;
};

export const createProduct = async (productData: Partial<Product>) => {
    const response = await client.post('/products', productData);
    return response.data;
};

export const updateProduct = async (id: string, productData: Partial<Product>) => {
    const response = await client.put(`/products/${id}`, productData);
    return response.data;
};

export const deleteProduct = async (id: string) => {
    const response = await client.delete(`/products/${id}`);
    return response.data;
};

export const getAutoSyncStatus = async () => {
    const response = await client.get('/products/store/sync-status');
    return response.data.autoPriceSync;
};

export const setAutoSyncStatus = async (autoPriceSync: boolean) => {
    const response = await client.put('/products/store/sync-status', { autoPriceSync });
    return response.data;
};

export const triggerManualSync = async () => {
    const response = await client.post('/products/store/sync-prices');
    return response.data;
};
