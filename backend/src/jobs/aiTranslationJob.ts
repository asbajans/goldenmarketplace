import Bull from 'bull';
import { Product } from '../models';
import ProductAITask from '../models/ProductAITask';
import aiService from '../services/aiService';
import planAccessService from '../services/planAccessService';

const AI_TRANSLATION_LANGUAGES = ['en', 'tr', 'it', 'es', 'ar'];

const aiTranslationQueue = new Bull('ai-translation', process.env.REDIS_URL || 'redis://localhost:6379', {
  defaultJobOptions: { removeOnComplete: 100, removeOnFail: 50 }
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
        const generated = await aiService.generateProductDescription(
          product.title,
          product.category,
          'tr',
          (product.tags || []).join(', ')
        );
        if (generated && generated !== product.title) {
          updatedDescription = generated;
          totalCredits += 1;
        }
      }
      if (taskId) await ProductAITask.update({ progress: 40 }, { where: { id: taskId } });
    }

    // Step 2: Translate to all languages
    if (taskType === 'translate' || taskType === 'both') {
      const needTranslate = AI_TRANSLATION_LANGUAGES.some(
        lang => !updatedTranslations[lang]?.title || !updatedTranslations[lang]?.description
      );
      if (needTranslate) {
        const translations = await aiService.translateProduct(
          updatedTitle,
          updatedDescription,
          AI_TRANSLATION_LANGUAGES
        );
        updatedTranslations = { ...updatedTranslations, ...translations };
        totalCredits += 1;
      }
      if (taskId) await ProductAITask.update({ progress: 80 }, { where: { id: taskId } });
    }

    // Step 3: Save
    await (product as any).update({
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
        result: { title: updatedTitle, description: updatedDescription, translations: updatedTranslations }
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

export async function queueAITranslation(productId: string, userId: string, taskType: 'translate' | 'generate_content' | 'both' = 'both') {
  const existing = await ProductAITask.findOne({
    where: { productId, taskType, status: ['pending', 'processing'] }
  });
  if (existing) return existing;

  const task = await ProductAITask.create({ productId, userId, taskType, status: 'pending' });

  await aiTranslationQueue.add(
    { productId, userId, taskType },
    { attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
  );

  return task;
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
