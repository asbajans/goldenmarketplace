import Bull from 'bull';
import { Op } from 'sequelize';
import { Product } from '../models';
import ProductAITask from '../models/ProductAITask';
import aiService from '../services/aiService';
import planAccessService from '../services/planAccessService';

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
  taskType: 'translate' | 'generate_content' | 'both';
}

aiTranslationQueue.process(async (job) => {
  const { productId, userId, taskType } = job.data as AIJobData;

  const product = await Product.findByPk(productId);
  if (!product) throw new Error(`Product ${productId} not found`);

  const task = await ProductAITask.findOne({
    where: { productId, taskType, status: ['pending', 'processing'] },
    order: [['createdAt', 'DESC']]
  });

  let taskId: string | null = null;
  if (task) {
    taskId = task.id;
    await task.update({ status: 'processing', progress: 10 });
  }

  try {
    let totalCredits = 0;
    let updatedTitle = product.title;
    let updatedDescription = product.description || '';
    let updatedTranslations = product.translations || {};

    // Check access before starting
    const access = await planAccessService.checkAIAccess(userId, 2);
    if (!access.allowed) {
      if (taskId) {
        await ProductAITask.update({ status: 'failed', error: access.message, creditsConsumed: 0 }, { where: { id: taskId } });
      }
      throw new Error(access.message);
    }

    // Step 1: Generate description if needed
    if (taskType === 'generate_content' || taskType === 'both') {
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
    let translateWarnings: Record<string, string> = {};
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
    if (defaultEntry?.description) updatedDescription = defaultEntry.description;
    await (product as any).update({
      title: updatedTitle,
      description: updatedDescription,
      translations: updatedTranslations
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
});

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

async function addJob(productId: string, userId: string, taskType: 'translate' | 'generate_content' | 'both') {
  return aiTranslationQueue.add(
    { productId, userId, taskType },
    { attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
  );
}

export async function queueAITranslation(productId: string, userId: string, taskType: 'translate' | 'generate_content' | 'both' = 'both') {
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

  const job = await addJob(productId, userId, taskType);
  await task.update({ jobId: String(job.id) } as any).catch(() => undefined);

  return task;
}

/**
 * Boot + periyodik süpürme: Bull karşılığı ölmüş DB satırlarını
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

export async function queueBatchAITranslation(productIds: string[], userId: string, taskType: 'translate' | 'generate_content' | 'both' = 'both') {
  const results: any[] = [];
  for (const productId of productIds) {
    const task = await queueAITranslation(productId, userId, taskType);
    results.push(task);
  }
  return results;
}

export default aiTranslationQueue;
