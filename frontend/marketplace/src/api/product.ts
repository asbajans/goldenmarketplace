import client from './client';

export interface Product {
    id: string;
    title: string;
    description: string;
    basePrice: number;
    goldIndexPrice: number;
    quantity: number;
    category: string;
    images?: string[];
    isActive: boolean;
    // seller info might be needed if we want to show who sold it
    // backend product model has storeId.
    storeId: string;
}

export const getProducts = async (params: { search?: string, category?: string, page?: number } = {}) => {
    const response = await client.get('/products', { params });
    return response.data; // { data: [...], pagination: {...} }
};
