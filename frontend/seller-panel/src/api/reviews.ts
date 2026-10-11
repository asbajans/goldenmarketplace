import client from './client';

export const getSellerReviews = (params?: { page?: number; limit?: number; approved?: boolean }) =>
  client.get('/reviews/seller', { params }).then(res => res.data);
