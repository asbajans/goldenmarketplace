import client from './client';

export interface Product {
    id: string;
    title: string;
    description: string;
    gramWeight: number;
    milyem: number;
    priceTRY: number;
    priceUSD: number;
    quantity: number;
    category: string;
    sku: string;
    images?: string[];
    videoUrl?: string;
    marketplaces?: string[];
    tags?: string[];
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

export const deleteProduct = async (id: string) => {
    const response = await client.delete(`/products/${id}`);
    return response.data;
}
