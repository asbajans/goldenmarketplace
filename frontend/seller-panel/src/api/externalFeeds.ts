import client from './client';

export interface ExternalFeed {
  id: string;
  storeId: string;
  name: string;
  feedUrl: string;
  fileFormat: 'xml' | 'csv' | 'xlsx' | 'json';
  authType: 'none' | 'basic' | 'bearer' | 'api-key';
  authCredentials?: any;
  pricingMode: 'fixed' | 'gold-formula';
  currency: 'TRY' | 'USD';
  defaultGramWeight?: number;
  defaultMilyem?: number;
  defaultProfitMargin?: number;
  priceMultiplier: number;
  defaultCategory?: string;
  defaultIsB2BEnabled?: boolean;
  defaultQuantity?: number;
  fieldMapping?: Record<string, string>;
  autoSync: boolean;
  updateInterval: 'manual' | 'hourly' | 'daily' | 'weekly';
  lastSyncAt?: string;
  lastSyncResult?: { total: number; added: number; updated: number; failed: number; errors: string[] };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FeedSyncLog {
  id: string;
  feedId: string;
  storeId: string;
  status: 'running' | 'success' | 'failed';
  startedAt: string;
  completedAt?: string;
  summary?: { total: number; added: number; updated: number; skipped: number; failed: number; errors: string[] };
  createdAt: string;
}

export const getFeeds = () =>
  client.get<{ data: ExternalFeed[] }>('/feeds').then(r => r.data.data);

export const getFeed = (id: string) =>
  client.get<{ data: ExternalFeed }>(`/feeds/${id}`).then(r => r.data.data);

export const createFeed = (data: Partial<ExternalFeed>) =>
  client.post<{ data: ExternalFeed; message: string }>('/feeds', data).then(r => r.data);

export const updateFeed = (id: string, data: Partial<ExternalFeed>) =>
  client.put<{ data: ExternalFeed; message: string }>(`/feeds/${id}`, data).then(r => r.data);

export const deleteFeed = (id: string) =>
  client.delete<{ message: string }>(`/feeds/${id}`).then(r => r.data);

export const testFeed = (id: string) =>
  client.post<{ success: boolean; headers: string[]; sampleData: any[]; total: number }>(`/feeds/${id}/test`).then(r => r.data);

export const previewFeed = (id: string, fieldMapping?: Record<string, string>) =>
  client.post<{ success: boolean; data: any[] }>(`/feeds/${id}/preview`, { fieldMapping }).then(r => r.data);

export const syncFeed = (id: string) =>
  client.post<{ message: string }>(`/feeds/${id}/sync`).then(r => r.data);

export const getFeedLogs = (id: string) =>
  client.get<{ data: FeedSyncLog[] }>(`/feeds/${id}/logs`).then(r => r.data.data);
