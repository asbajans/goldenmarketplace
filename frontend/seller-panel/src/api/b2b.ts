/**
 * B2B API client helpers for the seller panel
 */

import client from './client';

export interface B2BProduct {
  id: string;
  title: string;
  category: string;
  gramWeight: number;
  milyem: number;
  effectiveMilyem?: number;
  gramHas?: number;
  priceTRY: number;
  priceUSD: number;
  b2bPrice: number;
  b2bDiscount: number;
  images: string[];
  quantity: number;
  hasVariants?: boolean;
  variantAttributes?: string[];
  variants?: any[];
  store: { id: string; name: string; slug?: string };
  myRequestStatus: 'pending' | 'approved' | 'rejected' | null;
}

export interface B2BRequest {
  id: string;
  productId: string;
  requesterStoreId: string;
  ownerStoreId: string;
  status: 'pending' | 'approved' | 'rejected';
  requestNote?: string;
  createdAt: string;
  product?: { id: string; title: string; priceTRY: number; b2bPrice: number; images: string[]; category: string };
  requesterStore?: { id: string; name: string };
  ownerStore?: { id: string; name: string };
}

export interface B2BProductsResponse {
  data: B2BProduct[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

export interface StoreProductsResponse {
  store: { id: string; storeName: string; storeSlug: string; description?: string; logo?: string; rating: number; totalProducts: number };
  isAuthenticated: boolean;
  data: Partial<B2BProduct>[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

export const getB2BProducts = (params?: {
  page?: number; limit?: number; search?: string; category?: string; storeId?: string;
}) => client.get<B2BProductsResponse>('/b2b/products', { params });

export const getStoreProducts = (storeSlug: string, params?: {
  page?: number; limit?: number;
}) => client.get<StoreProductsResponse>(`/b2b/store/${storeSlug}`, { params });

export const createB2BRequest = (productId: string, variantId?: string, requestNote?: string) =>
  client.post('/b2b/requests', { productId, variantId, requestNote });

export const getIncomingRequests = () => client.get<B2BRequest[]>('/b2b/requests/incoming');

export const getOutgoingRequests = () => client.get<B2BRequest[]>('/b2b/requests/outgoing');

export const approveB2BRequest = (id: string) => client.put(`/b2b/requests/${id}/approve`);

export const rejectB2BRequest = (id: string) => client.put(`/b2b/requests/${id}/reject`);

export const listB2BProduct = (id: string, payload: { profitMargin: number; marketplaces: string[]; quantity?: number }) => 
  client.post(`/b2b/requests/${id}/list`, payload);
