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
  /** Toplu iş: bu Bull işi birden çok ürünü TEK seferde işler (10 ürün/çağrı). */
  batchProductIds?: string[];
}

/** Bir Bull işinde en fazla kaç ürün (LLM çağrısı başına da bu kadar ürün). */
const LUXURY_BATCH_SIZE = 10;

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
  // Bull aynı işleyiciyi concurrency kadar paralel işletir. Toplu işler
  // (batchProductIds) ayrı işlemciye yönlenir — tek ürün işleri etkilenmez.
  aiTranslationQueue.process(n, async (job: Bull.Job<AIJobData>) => {
    if (Array.isArray(job.data.batchProductIds) && job.data.batchProductIds.length > 0) {
      try {
        return await processLuxuryBatchJob(job);
      } catch (err: any) {
        // Toplu iş düştüyse açık satırları failed kapat — yoksa "processing"
        // takılı kalır ve panel kilitlenir. Bull retry taze satır açar
        // (bitmişlere dokunulmaz, çift kredi yok).
        for (const pid of job.data.batchProductIds || []) {
          await ProductAITask.update(
            { status: 'failed', error: err?.message || 'toplu iş hatası', completedAt: new Date() },
            { where: { productId: pid, taskType: 'luxury_description', status: ['pending', 'processing'] } }
          ).catch(() => undefined);
        }
        throw err;
      }
    }
    return processTranslationJob(job);
  });
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
      // İngilizce zaten üretildi — EN→EN çeviri çağrısı israftır, atlanır.
      const translateLangs = languageMode === 'en' ? [] : AI_TRANSLATION_LANGUAGES.filter(l => l !== 'en');
      const generatedEN = await aiService.generateLuxuryDescriptionFromTitleStrict(
        product.title,
        product.category,
        'English'
      );
      updatedDescription = generatedEN;
      totalCredits += 1;
      // EN girdisi doğrudan yazılır (çeviri çağrısı YOK)
      updatedTranslations = {
        ...updatedTranslations,
        en: { title: updatedTitle, description: generatedEN }
      };
      if (taskId) await ProductAITask.update({ progress: 40 }, { where: { id: taskId } });

      if (translateLangs.length > 0) {
        // Başlık+a açıklama İngilizce lüks metinden kalan dillere çevrilir
        const { translations, errors } = await aiService.translateProduct(
          updatedTitle,
          generatedEN,
          translateLangs
        );
        updatedTranslations = { ...updatedTranslations, ...translations };
        translateWarnings = errors;
        totalCredits += 1;
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

/**
 * TOPLU lüks açıklama kuyruğu: ürünler LUXURY_BATCH_SIZE'lık Bull işlerine
 * bölünür; her iş, içindeki TÜM ürünleri LLM'e TEK çağrıda gönderir
 * (açıklama 1 + dil başına 1 + etiket 1 çağrı). Tekli yola göre ~10x az
 * çağrı → aynı iş ~6-8x hızlı biter. Kredi/ürün aynı (en:1, all:2).
 * Zaten kuyrukta canlı işi olan ürünler atlanır (mükerrerlik yok).
 */
export async function queueLuxuryBatch(productIds: string[], userId: string, languageMode: 'en' | 'all' = 'all') {
  const taskByProduct = new Map<string, any>();
  for (const productId of productIds) {
    const existing = await ProductAITask.findOne({
      where: { productId, taskType: 'luxury_description', status: ['pending', 'processing'] },
      order: [['createdAt', 'DESC']]
    });
    if (existing) {
      if (await isJobLive(existing.jobId)) continue;
      await existing.update({
        status: 'failed',
        error: 'Kuyruktaki karşılığı bulunamadı (kesintiye uğradı), işlem tekrar kuyruğa alındı.',
        completedAt: new Date()
      }).catch(() => undefined);
    }
    const task = await ProductAITask.create({ productId, userId, taskType: 'luxury_description', status: 'pending' });
    taskByProduct.set(productId, task);
  }
  const fresh = [...taskByProduct.keys()];
  for (let i = 0; i < fresh.length; i += LUXURY_BATCH_SIZE) {
    const chunk = fresh.slice(i, i + LUXURY_BATCH_SIZE);
    const job = await aiTranslationQueue.add(
      { userId, taskType: 'luxury_description', batchProductIds: chunk, languageMode } as AIJobData,
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
    );
    for (const pid of chunk) {
      await taskByProduct.get(pid).update({ jobId: String(job.id) } as any).catch(() => undefined);
    }
  }
  return [...taskByProduct.values()];
}

/**
 * Toplu lüks iş işlemcisi: chunk'taki ürünlerin açıklaması TEK çağrıda
 * üretilir, kalan diller TEK çağrı/dil ile çevrilir, etiketler TEK çağrıda
 * çıkarılır. Toplu yanıtta eksik kalan ürünlere tekli yedek uygulanır.
 * Her ürün bağımsız kaydedilir/kredilendirilir; biri patlarsa diğerleri
 * etkilenmez. Retry güvenlidir: bitmiş ürünler atlanır (çift kredi yok).
 */
async function processLuxuryBatchJob(job: Bull.Job<AIJobData>) {
  const { batchProductIds = [], userId, languageMode = 'all' } = job.data as AIJobData;
  const translateLangs = languageMode === 'en' ? [] : AI_TRANSLATION_LANGUAGES.filter(l => l !== 'en');
  const creditPerProduct = translateLangs.length > 0 ? 2 : 1;

  const products = await Product.findAll({ where: { id: batchProductIds } });
  if (products.length === 0) throw new Error('Toplu işte işlenecek ürün bulunamadı');

  const access = await planAccessService.checkAIAccess(userId, products.length);
  if (!access.allowed) {
    for (const p of products) {
      await ProductAITask.update(
        { status: 'failed', error: access.message, creditsConsumed: 0, completedAt: new Date() },
        { where: { productId: (p as any).id, taskType: 'luxury_description', status: ['pending', 'processing'] } }
      ).catch(() => undefined);
    }
    throw new Error(access.message);
  }

  // Görev satırları (retry'de bitmişleri atla)
  const taskByProduct = new Map<string, any>();
  for (const p of products) {
    const pid = (p as any).id;
    let task = await ProductAITask.findOne({
      where: { productId: pid, taskType: 'luxury_description', status: ['pending', 'processing'] },
      order: [['createdAt', 'DESC']]
    });
    if (!task) {
      task = await ProductAITask.create({ productId: pid, userId, taskType: 'luxury_description', status: 'pending', jobId: String(job.id) } as any);
    }
    if ((task as any).status === 'completed') continue;
    await task.update({ status: 'processing', progress: 10, jobId: String(job.id) } as any).catch(() => undefined);
    taskByProduct.set(pid, task);
  }
  const active = products.filter(p => taskByProduct.has((p as any).id));
  if (active.length === 0) return { skipped: true, count: 0 };

  const setProgress = async (v: number) => {
    for (const t of taskByProduct.values()) {
      await ProductAITask.update({ progress: v }, { where: { id: (t as any).id } }).catch(() => undefined);
    }
  };

  // Adım 1: İngilizce lüks açıklamalar (TEK çağrı + tekli yedek)
  const enDesc = new Map<string, string>();
  const failed = new Map<string, string>();
  try {
    const { descriptions, errors } = await aiService.generateLuxuryDescriptionsBatch(
      active.map(p => ({ id: (p as any).id, title: (p as any).title, category: (p as any).category })),
      'English'
    );
    // Tümü aynı yapılandırma hatasıyla patladıysa (401/403/404) tekli
    // yedekler de aynı şekilde patlar — API'yi spamlama, hızlı bitir.
    const allErrs = Object.values(errors);
    if (active.length > 0 && allErrs.length === active.length && aiService.isConfigError(allErrs[0])) {
      throw new Error(allErrs[0]);
    }
    for (const [id, d] of Object.entries(descriptions)) enDesc.set(id, d);
    for (const p of active) {
      const pid = (p as any).id;
      if (!enDesc.has(pid)) {
        try {
          enDesc.set(pid, await aiService.generateLuxuryDescriptionFromTitleStrict((p as any).title, (p as any).category, 'English'));
        } catch (err: any) {
          failed.set(pid, err?.message || 'açıklama üretilemedi');
        }
      }
    }
  } catch (err: any) {
    // Fail-fast yukarı taşındıysa aynen ilet (dispatcher failed kapatır)
    if (aiService.isConfigError(String(err?.message || err))) throw err;
    // Toplu çağrı tamamen patladıysa tamamını tekliye düşür
    for (const p of active) {
      const pid = (p as any).id;
      try {
        enDesc.set(pid, await aiService.generateLuxuryDescriptionFromTitleStrict((p as any).title, (p as any).category, 'English'));
      } catch (e: any) {
        failed.set(pid, e?.message || 'açıklama üretilemedi');
      }
    }
  }
  await setProgress(40);

  // Adım 2: Kalan diller (dil başına TEK çağrı + tekli yedek)
  const transByProduct = new Map<string, Record<string, { title: string; description: string }>>();
  const withDesc = active.filter(p => enDesc.has((p as any).id));
  for (const p of withDesc) {
    transByProduct.set((p as any).id, { en: { title: (p as any).title, description: enDesc.get((p as any).id)! } });
  }
  for (const lang of translateLangs) {
    const langName = lang === 'tr' ? 'Turkish' : lang === 'it' ? 'Italian' : lang === 'es' ? 'Spanish' : 'Arabic';
    try {
      const { translations, errors } = await aiService.translateBatchStrict(
        withDesc.map(p => ({ id: (p as any).id, title: (p as any).title, description: enDesc.get((p as any).id)! })),
        langName
      );
      // Dilin tamamı yapılandırma hatasıyla patladıysa tekli yedekler de
      // patlar — hızlı bitir (görevler dispatcher'da failed kapatılır).
      const langErrs = Object.values(errors);
      if (withDesc.length > 0 && langErrs.length === withDesc.length && aiService.isConfigError(langErrs[0])) {
        throw new Error(langErrs[0]);
      }
      for (const [id, t] of Object.entries(translations)) transByProduct.get(id)![lang] = t;
      // Eksiklere tekli yedek
      for (const id of Object.keys(errors)) {
        const p = withDesc.find(x => (x as any).id === id);
        if (!p) continue;
        try {
          transByProduct.get(id)![lang] = await aiService.translateSingleStrict((p as any).title, enDesc.get(id)!, langName);
        } catch (err: any) {
          // Tek dil patladıysa ürün yine de EN + diğer dillerle kaydedilir
          const t = taskByProduct.get(id);
          const prev = ((t as any)?.result as any)?.warnings || {};
          if (t) await t.update({ result: { warnings: { ...prev, [lang]: err?.message || 'çeviri hatası' } } } as any).catch(() => undefined);
        }
      }
    } catch (err: any) {
      // Yapılandırma hatası yukarı taşınır (dispatcher görevleri failed
      // kapatır); tekli yedekler aynı hatayı verip API'yi spamlerdi.
      if (aiService.isConfigError(String(err?.message || err))) throw err;
      // Beklenmedik hata (ağ kopması vb.): ürünleri tek tek dene
      for (const p of withDesc) {
        const id = (p as any).id;
        if (transByProduct.get(id)![lang]) continue;
        try {
          transByProduct.get(id)![lang] = await aiService.translateSingleStrict((p as any).title, enDesc.get(id)!, langName);
        } catch { /* diğer dillerle devam */ }
      }
    }
  }
  await setProgress(80);

  // Adım 3: Etiketler (TEK çağrı; olmazsa ürün yine kaydedilir)
  try {
    const tags = await aiService.generateTagsBatch(
      withDesc.map(p => ({ id: (p as any).id, title: (p as any).title, description: enDesc.get((p as any).id)! })),
      'English'
    );
    for (const p of withDesc) {
      const t = tags[(p as any).id];
      if (t && t.length > 0) {
        const existing = Array.isArray((p as any).tags) ? (p as any).tags : [];
        (p as any).set('tags', [...new Set([...existing, ...t])].slice(0, 20));
      }
    }
  } catch { /* etiket opsiyonel */ }

  // Adım 4: Kaydet + kredilendir (ürün bağımsız)
  let completed = 0;
  for (const p of active) {
    const pid = (p as any).id;
    const task = taskByProduct.get(pid);
    try {
      if (failed.has(pid)) throw new Error(failed.get(pid)!);
      const descEN = enDesc.get(pid)!;
      const trans = transByProduct.get(pid) || { en: { title: (p as any).title, description: descEN } };
      const defaultLang = (p as any).defaultLanguage || 'en';
      const defaultEntry = (trans as any)[defaultLang] || (trans as any).en;
      const finalTitle = defaultEntry?.title || (p as any).title;
      const finalDesc = cleanFeedDescription(defaultEntry?.description || descEN);
      for (const lang of Object.keys(trans)) {
        const entry = (trans as any)[lang];
        if (entry?.description) entry.description = cleanFeedDescription(entry.description);
      }
      const update: any = { title: finalTitle, description: finalDesc, translations: { ...((p as any).translations || {}), ...trans } };
      if ((p as any).changed('tags')) update.tags = (p as any).get('tags');
      await (p as any).update(update);
      await planAccessService.deductCredits(userId, creditPerProduct);
      const warnings = (((task as any)?.result as any)?.warnings) || {};
      await ProductAITask.update(
        { status: 'completed', progress: 100, creditsConsumed: creditPerProduct, completedAt: new Date(), result: { title: finalTitle, description: finalDesc, translations: trans, warnings } },
        { where: { id: (task as any).id } }
      );
      completed++;
    } catch (err: any) {
      await ProductAITask.update(
        { status: 'failed', error: err?.message || 'kaydetme hatası', completedAt: new Date() },
        { where: { id: (task as any).id } }
      ).catch(() => undefined);
    }
  }
  return { count: active.length, completed };
}

export default aiTranslationQueue;
