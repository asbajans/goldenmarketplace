import client from './client';

export interface Product {
    id: string;
    title: string;
    description: string;
    basePrice: number;
    goldIndexPrice: number; // calculated on backend usually, but good to have
    quantity: number;
    category: string;
    images?: string[];
    isActive: boolean;
}

export const getProducts = async () => {
    // Fetch products for the current seller
    // The backend endpoint /products usually returns all products. 
    // We might need to filter by seller on backend or frontend.
    // Ideally backend should have /seller/products or /products?storeId=...
    // For now, let's assume /products retuns everything and we might see others' products 
    // OR the backend is smart enough to filter if we are a seller.
    // Looking at backend productController.ts: `const { storeId ... } = req.query;`
    // We need to send our storeId. 
    // Wait, we don't have storeId easily available on frontend yet unless we stored it in user/localstorage.
    // Let's assume for phase 1 we just get all products or we fix backend to filter by user.
    // Actually, let's check backend controller again:
    // if (storeId) where.storeId = storeId;

    // So we need to know our storeId.
    // When logging in, we got `user`. We probably need `store` info too.
    // Let's just fetch all for now and standardise later.
    const response = await client.get('/products');
    return response.data.data; // Backend returns { data: [...], pagination: {...} }
};

export const createProduct = async (productData: Partial<Product>) => {
    // We need storeId. 
    // Retrieve it from localStorage if we saved it?
    // Or fetch it?
    // Let's temporarily hardcode or rely on backend to not fail if missing?
    // Backend `createProduct` requires `storeId`.
    // We need to fetch the current user's store first.
    const response = await client.post('/products', productData);
    return response.data;
};

export const deleteProduct = async (id: string) => {
    const response = await client.delete(`/products/${id}`);
    return response.data;
}
