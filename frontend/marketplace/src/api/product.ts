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
    images?: string[];
    isActive: boolean;
    storeId: string;
}

export const getProducts = async (params: { search?: string, category?: string, page?: number } = {}) => {
    const response = await client.get('/products', { params });
    return response.data; // { data: [...], pagination: {...} }
};
