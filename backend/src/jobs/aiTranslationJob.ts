import Bull from 'bull';
import { Op } from 'sequelize';
import { Product } from '../models';
import ProductAITask from '../models/ProductAITask';
import aiService from '../services/aiService';
import planAccessService from '../services/planAccessService';
import { cleanFeedDescription } from '../utils/validation';

const AI_TRANSLATION_LANGUAGES = ['en', 'tr', 'it', 'es', 'ar'];

const aiTranslationQueue = new Bull('ai-translation', process.env.REDIS_URL || 'redis://localhost:6379', {
  defaultJobOptions: { removeOnComplete: 100, removeOnFail: 50 },
  // Ürün başına ~6-7 AI çağrısı dakikalar sürebilir. Varsayılan 30 sn'lik
  // kilit, bitmeyen işi "takıldı" sanıp İKİNCİ kez çalıştırıyordu (çift
  // API harcaması + çift kredi riski). Kilit 10 dk, yenileme 30 sn.
  settings: {
    lockDuration: 600000,
    lockRenewTime: 30000,
    stalledInterval: 60000,
    maxStalledCount: 1
  }
});

interface AIJobData {
  productId: string;
  userId: string;
  taskType: 'translate' | 'generate_content' | 'both' | 'luxury_description';
  /** luxury_description için: 'en' = sadece İngilizce, 'all' = 5 dil */
  languageMode?: 'en' | 'all';
}

/**
 * Kuyruk eşzamanlılığı (ai_queue_concurrency, 1-10, varsayılan 3).
 * TEK global kuyruk tüm satıcıları sırayla işletiyordu (concurrency 1);
 * ürün başına ~5-6 LLM çağrısı dakikalar sürdüğü için eşzamanlı
 * kullanıcılar birbirini kilitliyordu. Değer değişikliği restart ister.
 */
async function getQueueConcurrency(): Promise<number> {
  try {
    const { default: GlobalSetting } = await import('../models/GlobalSetting');
    const row = await GlobalSetting.findOne({ where: { key: 'ai_queue_concurrency' } });
    const n = parseInt(String(row?.value || '3'), 10);
    return Math.min(Math.max(n || 3, 1), 10);
  } catch {
    return 3;
  }
}

getQueueConcurrency().then((n) => {
  // Bull aynı işleyiciyi concurrency kadar paralel işletir.
  aiTranslationQueue.process(n, processTranslationJob);
  console.log(`[AITranslation] Queue worker started (concurrency: ${n})`);
}).catch((err) => {
  console.error('[AITranslation] Failed to start queue worker:', err?.message || err);
});

async function processTranslationJob(job: Bull.Job<AIJobData>) {
  const { productId, userId, taskType } = job.data as AIJobData;

  const product = await Product.findByPk(productId);
  if (!product) throw new Error(`Product ${productId} not found`);

  const task = await ProductAITask.findOne({
    where: { productId, taskType, status: ['pending', 'processing'] },
    order: [['createdAt', 'DESC']]
  });

  // Açık satır yoksa bu iş yetim/çift demektir: çeviri YAPMA, kredi
  // DÜŞÜRME, sessizce bitir. (Aksi halde görünmez işler krediyi eritir.)
  if (!task) {
    return { skipped: true, productId, taskType };
  }

  let taskId: string | null = null;
  taskId = task.id;
  await task.update({ status: 'processing', progress: 10 });

  try {
    let totalCredits = 0;
    let updatedTitle = product.title;
    // AI'ya kirli HTML gitmesin ve kirli çeviri geri yazılmasın: girişte temizle
    let updatedDescription = cleanFeedDescription(product.description || '');
    let updatedTranslations = product.translations || {};
    let translateWarnings: Record<string, string> = {};

    // Check access before starting
    const access = await planAccessService.checkAIAccess(userId, 2);
    if (!access.allowed) {
      if (taskId) {
        await ProductAITask.update({ status: 'failed', error: access.message, creditsConsumed: 0 }, { where: { id: taskId } });
      }
      throw new Error(access.message);
    }

    // Step 1: Generate description if needed
    if (taskType === 'luxury_description') {
      // LÜKS TOPLU AÇIKLAMA: mevcut açıklama BİLEREK okunmaz — sadece
      // başlıktan üretilir. Dil modu: 'en' = tek İngilizce açıklama,
      // 'all' = İngilizce + 4 dile çeviri. Etiketler açıklamadan otomatik.
      const languageMode = (job.data as AIJobData).languageMode || 'all';
      const targetLangs = languageMode === 'en' ? ['en'] : AI_TRANSLATION_LANGUAGES;
      const generatedEN = await aiService.generateLuxuryDescriptionFromTitleStrict(
        product.title,
        product.category,
        'English'
      );
      updatedDescription = generatedEN;
      totalCredits += 1;
      if (taskId) await ProductAITask.update({ progress: 40 }, { where: { id: taskId } });

      if (targetLangs.length > 1) {
        // Başlık her dile çevrilir; açıklama İngilizce lüks metinden çevrilir
        const { translations, errors } = await aiService.translateProduct(
          updatedTitle,
          generatedEN,
          targetLangs
        );
        updatedTranslations = { ...updatedTranslations, ...translations };
        translateWarnings = errors;
        totalCredits += 1;
      } else {
        updatedTranslations = {
          ...updatedTranslations,
          en: { title: updatedTitle, description: generatedEN }
        };
      }
      // Otomatik etiketler (başarısız olursa sessiz geç — açıklama korunur)
      try {
        const tags = await aiService.generateTagsFromDescription(updatedTitle, generatedEN, 'English');
        if (tags.length > 0) {
          const existing = Array.isArray((product as any).tags) ? (product as any).tags : [];
          (product as any).set('tags', [...new Set([...existing, ...tags])].slice(0, 20));
        }
      } catch { /* etiket opsiyonel */ }
      if (taskId) await ProductAITask.update({ progress: 80 }, { where: { id: taskId } });
    } else if (taskType === 'generate_content' || taskType === 'both') {
      if (!product.description || product.description.length < 50) {
        // Üretim başarısızsa sessiz geçme — task failed olsun, satıcı nedenini görsün
        const generated = await aiService.generateProductDescriptionStrict(
          product.title,
          product.category,
          'Turkish',
          (product.tags || []).join(', ')
        );
        updatedDescription = generated;
        totalCredits += 1;
      }
      if (taskId) await ProductAITask.update({ progress: 40 }, { where: { id: taskId } });
    }

    // Step 2: Translate title + description to all languages
    if (taskType === 'translate' || taskType === 'both') {
      const needTranslate = AI_TRANSLATION_LANGUAGES.some(
        lang => !updatedTranslations[lang]?.title || !updatedTranslations[lang]?.description
      );
      if (needTranslate) {
        // Hiçbir dil çevrilemezse hata fırlatır (task failed + mesaj)
        const { translations, errors } = await aiService.translateProduct(
          updatedTitle,
          updatedDescription,
          AI_TRANSLATION_LANGUAGES
        );
        updatedTranslations = { ...updatedTranslations, ...translations };
        translateWarnings = errors;
        totalCredits += 1;
      }
      if (taskId) await ProductAITask.update({ progress: 80 }, { where: { id: taskId } });
    }

    // Step 3: Save (ana başlık+a açıklama da varsayılan dilin çevirisiyle
    // senkron tutulur; yoksa liste tablosu hep eski dilde kalır ve
    // "başlıklar çevrilmedi" gibi görünür)
    const defaultLang = (product as any).defaultLanguage || 'en';
    const defaultEntry = (updatedTranslations as any)[defaultLang];
    if (defaultEntry?.title) updatedTitle = defaultEntry.title;
    if (defaultEntry?.description) updatedDescription = cleanFeedDescription(defaultEntry.description);
    // AI kirli HTML döndürebilir (eski çevirilerde MsoNormal vardı): kaydetmeden arındır
    for (const lang of Object.keys(updatedTranslations)) {
      const entry = (updatedTranslations as any)[lang];
      if (entry?.description) entry.description = cleanFeedDescription(entry.description);
    }
    await (product as any).update({
      title: updatedTitle,
      description: cleanFeedDescription(updatedDescription),
      translations: updatedTranslations,
      // luxury_description dalında set() ile biriken etiketleri de yaz
      ...(taskType === 'luxury_description' && (product as any).changed('tags')
        ? { tags: (product as any).get('tags') }
        : {})
    });

    // Deduct credits
    if (totalCredits > 0) {
      await planAccessService.deductCredits(userId, totalCredits);
    }

    if (taskId) {
      await ProductAITask.update({
        status: 'completed',
        progress: 100,
        creditsConsumed: totalCredits,
        completedAt: new Date(),
        result: {
          title: updatedTitle,
          description: updatedDescription,
          translations: updatedTranslations,
          warnings: translateWarnings
        }
      }, { where: { id: taskId } });
    }

    return { productId, taskType, creditsConsumed: totalCredits };

  } catch (error: any) {
    if (taskId) {
      await ProductAITask.update({
        status: 'failed',
        error: error.message,
        completedAt: new Date()
      }, { where: { id: taskId } });
    }
    throw error;
  }
}

/** Bull'daki iş gerçekten yaşıyor mu (waiting/active/delayed/paused/stuck)? */
async function isJobLive(jobId: string | null | undefined): Promise<boolean> {
  if (!jobId) return false;
  try {
    const job = await aiTranslationQueue.getJob(jobId);
    if (!job) return false;
    const state = await job.getState().catch(() => null);
    return state === 'active' || state === 'waiting' || state === 'delayed' || state === 'paused' || state === 'stuck';
  } catch {
    return false;
  }
}

export type AITaskType = 'translate' | 'generate_content' | 'both' | 'luxury_description';

async function addJob(productId: string, userId: string, taskType: AITaskType, languageMode?: 'en' | 'all') {
  return aiTranslationQueue.add(
    { productId, userId, taskType, languageMode },
    { attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
  );
}

export async function queueAITranslation(productId: string, userId: string, taskType: AITaskType = 'both', languageMode?: 'en' | 'all') {
  const existing = await ProductAITask.findOne({
    where: { productId, taskType, status: ['pending', 'processing'] },
    order: [['createdAt', 'DESC']]
  });
  if (existing) {
    // Kuyrukta karşılığı varsa bekle; YOKSA (deploy/restart'ta ölen işler)
    // eski satırı kapatıp taze iş kur — yoksa "pending" sonsuza dek sürer.
    if (await isJobLive(existing.jobId)) return existing;
    await existing.update({
      status: 'failed',
      error: 'Kuyruktaki karşılığı bulunamadı (kesintiye uğradı), işlem tekrar kuyruğa alındı.',
      completedAt: new Date()
    }).catch(() => undefined);
  }

  const task = await ProductAITask.create({ productId, userId, taskType, status: 'pending' });

  const job = await addJob(productId, userId, taskType, languageMode);
  await task.update({ jobId: String(job.id) } as any).catch(() => undefined);

  return task;
}

/**
 * Satıcının bekleyen/işlenen TÜM işlerini iptal et (kuyruğu temizle).
 * Bull karşılığı silinir, DB satırı "iptal edildi" olarak kapatılır.
 * Bitmiş işlere dokunulmaz; kredi yalnızca gerçekten işlenene düşer
 * (iptal edilenlerden kredi gitmez).
 */
export async function cancelUserTasks(userId: string): Promise<number> {
  const open = await ProductAITask.findAll({
    where: { userId, status: ['pending', 'processing'] }
  });
  let cancelled = 0;
  for (const t of open) {
    try {
      if (t.jobId) {
        const job = await aiTranslationQueue.getJob(t.jobId).catch(() => null);
        // Aktif iş bitmek üzeredir — zorla öldürme, kendi haline bırak
        // (bitince sonucunu kaydeder); sadece kuyruktakileri düşür.
        if (job) {
          const state = await job.getState().catch(() => null);
          if (state === 'waiting' || state === 'delayed' || state === 'paused') {
            await job.remove().catch(() => undefined);
          } else {
            continue;
          }
        }
      }
      await t.update({
        status: 'failed',
        error: 'Satıcı tarafından iptal edildi.',
        completedAt: new Date()
      });
      cancelled++;
    } catch {
      /* sonrakine geç */
    }
  }
  return cancelled;
}

/**
 * Boot süpürmesi: Bull karşılığı ölmüş DB satırlarını
 * (deploy/restart artıkları, jobId'siz eskiler dahil) yeniden kuyruğa al.
 */
export async function requeueOrphanedTasks(olderThanMin = 15): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanMin * 60000);
  const stuck = await ProductAITask.findAll({
    where: { status: ['pending', 'processing'], createdAt: { [Op.lt]: cutoff } }
  });
  let requeued = 0;
  for (const t of stuck) {
    try {
      if (await isJobLive(t.jobId)) continue;
      await t.update({ status: 'pending', progress: 0 });
      const job = await addJob(t.productId, t.userId, t.taskType);
      await t.update({ jobId: String(job.id) } as any);
      requeued++;
    } catch {
      /* sonrakine geç */
    }
  }
  return requeued;
}

export async function queueBatchAITranslation(productIds: string[], userId: string, taskType: AITaskType = 'both', languageMode?: 'en' | 'all') {
  const results: any[] = [];
  for (const productId of productIds) {
    const task = await queueAITranslation(productId, userId, taskType, languageMode);
    results.push(task);
  }
  return results;
}

export default aiTranslationQueue;
