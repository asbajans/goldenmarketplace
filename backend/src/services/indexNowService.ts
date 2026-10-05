/**
 * IndexNow Service
 * Instant URL submission to Bing/Yandex/Naver/Seznam (indexnow.org).
 * Improves visibility in search engines and AI answers built on their index.
 *
 * Config lives in GlobalSetting (admin-manageable, seeded in server.ts):
 *   indexnow_key     - verification key (also served as /<key>.txt on the site)
 *   indexnow_enabled - 'true' | 'false'
 *
 * Docs: https://www.indexnow.org/documentation
 */

const { GlobalSetting } = require('../models/GlobalSetting');

const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';
const SITE_HOST = 'goldencrafters.com';
const SITE_URL = 'https://goldencrafters.com';
export const SITE_LOCALES = ['en', 'tr', 'it', 'ar', 'es'];

export interface IndexNowConfig {
  key: string;
  enabled: boolean;
  keyLocation: string;
}

export async function getIndexNowConfig(): Promise<IndexNowConfig> {
  const rows: any[] = await GlobalSetting.findAll({
    where: { key: ['indexnow_key', 'indexnow_enabled'] }
  });
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;
  const key = (map.indexnow_key || '').trim();
  return {
    key,
    enabled: key.length > 0 && map.indexnow_enabled !== 'false',
    keyLocation: key ? `${SITE_URL}/${key}.txt` : ''
  };
}

export interface IndexNowResult {
  ok: boolean;
  status: number;
  submitted: number;
  error?: string;
}

/**
 * Submit up to 10.000 URLs (IndexNow limit per request) for instant crawling.
 * Fire-and-forget safe: never throws, returns { ok:false } on any failure.
 */
export async function submitUrls(urls: string[]): Promise<IndexNowResult> {
  const cfg = await getIndexNowConfig();
  const list = [...new Set((urls || []).filter(Boolean))].slice(0, 10000);
  if (!cfg.enabled) {
    return { ok: false, status: 0, submitted: 0, error: 'IndexNow disabled or key missing' };
  }
  if (list.length === 0) {
    return { ok: false, status: 0, submitted: 0, error: 'No URLs to submit' };
  }
  try {
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: SITE_HOST,
        key: cfg.key,
        keyLocation: cfg.keyLocation,
        urlList: list
      })
    });
    // 200 OK / 202 Accepted = accepted. 4xx = key/validation problem.
    if (res.ok) {
      return { ok: true, status: res.status, submitted: list.length };
    }
    const text = await res.text().catch(() => '');
    return { ok: false, status: res.status, submitted: 0, error: text.slice(0, 300) };
  } catch (err: any) {
    return { ok: false, status: 0, submitted: 0, error: err?.message || 'Network error' };
  }
}

/** Localized product URLs for instant indexing after create/update. */
export function productUrls(slugOrId: string): string[] {
  const slug = encodeURIComponent(String(slugOrId));
  return SITE_LOCALES.map(l => `${SITE_URL}/${l}/p/${slug}`);
}

/** Localized blog post URLs for instant indexing after publish. */
export function blogPostUrls(postId: string | number): string[] {
  const id = encodeURIComponent(String(postId));
  return SITE_LOCALES.map(l => `${SITE_URL}/${l}/blog/${id}`);
}

/** Localized category listing URLs after category changes. */
export function categoryUrls(slug: string): string[] {
  const s = encodeURIComponent(String(slug));
  return SITE_LOCALES.map(l => `${SITE_URL}/${l}/products?type=${s}`);
}

/** Non-blocking helper for route/controller hooks — logs and swallows errors. */
export function submitUrlsAsync(urls: string[]): void {
  submitUrls(urls)
    .then(r => {
      if (!r.ok) console.warn(`[IndexNow] submit failed (${r.status}): ${r.error}`);
      else console.log(`[IndexNow] submitted ${r.submitted} url(s)`);
    })
    .catch(err => console.warn('[IndexNow] submit error:', err?.message || err));
}

export default {
  getIndexNowConfig,
  submitUrls,
  submitUrlsAsync,
  productUrls,
  blogPostUrls,
  categoryUrls,
  SITE_LOCALES
};
