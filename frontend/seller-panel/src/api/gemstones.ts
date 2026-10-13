import client from './client';

export interface Gemstone {
  id: string;
  storeId: string | null;
  name: string;
  pricePerCaratUSD: number;
  cutMultipliers?: Record<string, number>;
  qualityMultipliers?: Record<string, number>;
  isActive: boolean;
}

export interface ProductStone {
  id: string;
  productId: string;
  gemstoneId: string;
  carat?: number | null;
  cut?: string | null;
  quality?: string | null;
  quantity: number;
}

const linesToObj = (text?: string): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const line of String(text || '').split('\n')) {
    const [k, v] = line.split('=').map(s => (s || '').trim());
    const n = Number((v || '').replace(',', '.'));
    if (k && Number.isFinite(n) && n > 0) out[k] = n;
  }
  return out;
};

const objToLines = (obj?: Record<string, number>): string =>
  Object.entries(obj || {}).map(([k, v]) => `${k}=${v}`).join('\n');

export const gemstoneHelpers = { linesToObj, objToLines };

export const FALLBACK_CUTS = ['baget', 'markiz', 'oval', 'prenses', 'yuvarlak', 'damla', 'zümrüt', 'kalemli'];
export const FALLBACK_QUALITIES = ['FG/SI', 'VS1', 'VS2', 'VVS1', 'VVS2', 'SI1'];

const parseList = (raw: any, fallback: string[]): string[] => {
  try {
    const arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(arr) && arr.length > 0 ? arr.map((x: any) => String(x)) : fallback;
  } catch {
    return fallback;
  }
};

export const getStoneLists = async (): Promise<{ cuts: string[]; qualities: string[] }> => {
  try {
    const { data } = await client.get('/settings/public');
    return {
      cuts: parseList(data?.gemstone_cuts, FALLBACK_CUTS),
      qualities: parseList(data?.gemstone_qualities, FALLBACK_QUALITIES)
    };
  } catch {
    return { cuts: FALLBACK_CUTS, qualities: FALLBACK_QUALITIES };
  }
};

export const getGemstones = () =>
  client.get<{ data: Gemstone[] }>('/gemstones').then(r => r.data.data);

export const createGemstone = (data: Partial<Gemstone> & { cutLines?: string; qualityLines?: string }) =>
  client.post('/gemstones', {
    ...data,
    cutMultipliers: data.cutMultipliers ?? linesToObj(data.cutLines),
    qualityMultipliers: data.qualityMultipliers ?? linesToObj(data.qualityLines)
  }).then(r => r.data);

export const updateGemstone = (id: string, data: Partial<Gemstone> & { cutLines?: string; qualityLines?: string }) => {
  const payload: any = { ...data };
  if (data.cutLines !== undefined) payload.cutMultipliers = linesToObj(data.cutLines);
  if (data.qualityLines !== undefined) payload.qualityMultipliers = linesToObj(data.qualityLines);
  return client.put(`/gemstones/${id}`, payload).then(r => r.data);
};

export const deleteGemstone = (id: string) =>
  client.delete(`/gemstones/${id}`).then(r => r.data);

export const getProductStones = (productId: string) =>
  client.get(`/products/${productId}/stones`).then(r => r.data.data);

export const addProductStone = (productId: string, data: Partial<ProductStone>) =>
  client.post(`/products/${productId}/stones`, data).then(r => r.data);

export const deleteProductStone = (stoneId: string) =>
  client.delete(`/products/stones/${stoneId}`).then(r => r.data);
