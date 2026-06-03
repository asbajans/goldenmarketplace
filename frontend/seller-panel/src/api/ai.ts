import client from './client';

export const getCreditBalance = () => client.get('/ai/credits/balance').then(res => res.data);

export const getCreditPrices = () => client.get('/ai/credits/prices').then(res => res.data);

export const purchaseCredits = (credits: number, amount: number) =>
  client.post('/ai/credits/purchase', { credits, amount }).then(res => res.data);

export const getAITasks = (status?: string) =>
  client.get('/ai/tasks', { params: { status } }).then(res => res.data);

export const translateProduct = (id: string) =>
  client.post(`/ai/products/${id}/translate`).then(res => res.data);

export const generateProductContent = (id: string) =>
  client.post(`/ai/products/${id}/generate`).then(res => res.data);

export const getProductAIStatus = (id: string) =>
  client.get(`/ai/products/${id}/ai-status`).then(res => res.data);

export const bulkAITranslate = (productIds: string[], taskType = 'both') =>
  client.post('/ai/products/bulk-ai', { productIds, taskType }).then(res => res.data);
