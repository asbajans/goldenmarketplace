import client from './client';

export interface ReturnRequest {
  id: string;
  orderId: string;
  orderItemId?: string | null;
  productId: string;
  reason: string;
  customerNote?: string | null;
  quantity: number;
  refundAmount?: number | null;
  status: string;
  sellerNote?: string | null;
  returnAddress?: string | null;
  trackingNumber?: string | null;
  createdAt: string;
  order?: { id: string; orderNumber: string; status: string; totalAmount: number };
  product?: { id: string; title: string; sku: string };
}

export const getSellerReturns = (params?: { page?: number; limit?: number; status?: string }) =>
  client.get('/returns/seller', { params }).then(res => res.data);

export const respondReturn = (id: string, data: { approve: boolean; returnAddress?: string; sellerNote?: string }) =>
  client.post(`/returns/${id}/respond`, data).then(res => res.data);

export const inspectReturn = (id: string, data: { accepted: boolean; sellerNote?: string }) =>
  client.post(`/returns/${id}/inspect`, data).then(res => res.data);

export const refundReturn = (id: string, data?: { refundAmount?: number }) =>
  client.post(`/returns/${id}/refund`, data || {}).then(res => res.data);
