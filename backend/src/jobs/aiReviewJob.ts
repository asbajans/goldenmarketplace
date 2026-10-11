/**
 * AI Review Job
 * Admin "AI ile Yorum Üret" isteği senkron değil kuyrukta çalışır:
 * HTTP yanıtı anında döner, üretim arka planda sürer, admin panel
 * durum endpointinden ilerlemeyi izler. (Senkron sürümde 10 yorum =
 * dakikalarca açık HTTP → proxy timeout → "başarısız" görüntüsü.)
 */
import Bull from 'bull';
import Product from '../models/Product';
import ProductReview from '../models/ProductReview';
import { normalizeReviewLanguage } from '../services/reviewService';

const aiReviewQueue = new Bull('ai-reviews', process.env.REDIS_URL || 'redis://localhost:6379', {
  defaultJobOptions: { removeOnComplete: 50, removeOnFail: 100 }
});

export interface ReviewBatchData {
  productId: string;
  count: number;
  langs: string[];
}

function pickReviewerName(lang: string): string {
  const first: Record<string, string[]> = {
    en: ['Emma', 'James', 'Sophia', 'Liam', 'Olivia', 'Noah', 'Ava', 'William', 'Mia', 'Lucas'],
    tr: ['Elif', 'Mehmet', 'Zeynep', 'Ahmet', 'Selin', 'Burak', 'Deniz', 'Emre', 'Gül', 'Kaan'],
    it: ['Sofia', 'Marco', 'Giulia', 'Alessandro', 'Martina', 'Lorenzo', 'Chiara', 'Davide'],
    es: ['Lucía', 'Mateo', 'Sofía', 'Hugo', 'Martina', 'Pablo', 'Valeria', 'Diego'],
    ar: ['Layla', 'Omar', 'Fatima', 'Yusuf', 'Nour', 'Karim', 'Salma', 'Tariq']
  };
  const pool = first[lang] || first.en;
  const f = pool[Math.floor(Math.random() * pool.length)];
  const letters = 'ABCDEFGHIJKLMNOPRSTUVYZ';
  const initial = letters[Math.floor(Math.random() * letters.length)];
  return `${f} ${initial}.`;
}

async function processReviewBatch(job: Bull.Job<ReviewBatchData>) {
  const { productId, count, langs } = job.data;
  const { default: aiService } = await import('../services/aiService');

  const product = await Product.findByPk(productId);
  if (!product) throw new Error('Product not found');

  const created: Array<{ id: string; rating: number; language: string }> = [];
  let lastError = '';
  const total = Math.min(Math.max(count, 1), 10);

  for (let i = 0; i < total; i++) {
    const roll = Math.random();
    const rating = roll < 0.6 ? 5 : roll < 0.9 ? 4 : 3;
    const lang = normalizeReviewLanguage(langs[i % langs.length]);
    const langNames: Record<string, string> = { en: 'English', tr: 'Turkish', it: 'Italian', es: 'Spanish', ar: 'Arabic' };
    const sysPrompt =
      `You are a verified-style jewelry shopper writing a short product review in ${langNames[lang]}. ` +
      `Write a realistic ${rating}-star review: 1-6 word TITLE and 1-3 sentence COMMENT about quality, look, packaging or gifting. ` +
      `Vary tone across reviews (enthusiastic, practical, gift-giver). No HTML, no markdown, no quotes around the whole text. ` +
      `Return ONLY raw JSON: {"title": "...", "comment": "..."}`;
    const userPrompt = `Product: ${product.title}\nCategory: ${product.category || ''}\nRating: ${rating}/5`;

    let res: any = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        res = await aiService.generateForPurpose('reviews', sysPrompt, userPrompt);
      } catch (e: any) {
        res = { success: false, error: e?.message };
      }
      if (res.success && res.content) break;
      lastError = res.error || lastError;
    }
    if (res && res.success && res.content) {
      let parsed: any = null;
      try {
        parsed = JSON.parse(res.content.trim());
      } catch {
        const m = res.content.match(/\{[\s\S]*\}/);
        if (m) {
          try { parsed = JSON.parse(m[0]); } catch { parsed = null; }
        }
      }
      const title = typeof parsed?.title === 'string' ? parsed.title.slice(0, 255).trim() : '';
      const comment = typeof parsed?.comment === 'string' ? parsed.comment.slice(0, 5000).trim() : '';
      if (comment) {
        const row = await ProductReview.create({
          productId,
          userId: null,
          reviewerName: pickReviewerName(lang),
          rating,
          title: title || null,
          comment,
          language: lang,
          translations: {},
          source: 'ai',
          isApproved: false,
          isVerifiedPurchase: false
        });
        created.push({ id: (row as any).id, rating, language: lang });
      }
    }
    await job.progress(Math.round(((i + 1) / total) * 100)).catch(() => undefined);
  }

  if (created.length === 0) {
    throw new Error(`Hiçbir yorum üretilemedi.${lastError ? ` Son hata: ${String(lastError).slice(0, 300)}` : ''}`);
  }
  return { created: created.length, reviews: created };
}

// Concurrency 2: ücretsiz katman rate-limit'ini yormadan tek üründen hızlı.
aiReviewQueue.process(2, processReviewBatch);

export async function queueReviewBatch(data: ReviewBatchData) {
  return aiReviewQueue.add(data, { attempts: 1, removeOnComplete: 50, removeOnFail: 100 });
}

export async function getReviewBatchStatus(jobId: string): Promise<{
  state: string; progress: number; result?: any; failedReason?: string;
}> {
  const job = await aiReviewQueue.getJob(jobId);
  if (!job) return { state: 'unknown', progress: 0 };
  const state = await job.getState().catch(() => 'unknown');
  const progress = Number((job as any).progress) || 0;
  if (state === 'completed') {
    const result = await job.returnvalue;
    return { state, progress: 100, result };
  }
  if (state === 'failed') {
    return { state, progress, failedReason: String(job.failedReason || '').slice(0, 500) };
  }
  return { state, progress };
}

export default aiReviewQueue;
