import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Product, Store } from '../models';
import ProductAITask from '../models/ProductAITask';
import GlobalSetting from '../models/GlobalSetting';
import aiService from '../services/aiService';
import planAccessService from '../services/planAccessService';
import { queueAITranslation, queueBatchAITranslation } from '../jobs/aiTranslationJob';

export class AIController {

  // ─── Admin AI Settings ───

  static async getAISettings(_req: Request, res: Response) {
    try {
      const settings = await GlobalSetting.findAll({
        where: { key: ['ai_provider', 'ai_api_key', 'ai_model', 'ai_credit_packs', 'ai_translation_cost', 'ai_content_cost'] }
      });
      const result: any = {};
      for (const s of settings) result[s.key] = s.value;
      return res.json(result);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch AI settings' });
    }
  }

  static async updateAISettings(req: Request, res: Response) {
    try {
      const allowed = ['ai_provider', 'ai_api_key', 'ai_model', 'ai_credit_packs', 'ai_translation_cost', 'ai_content_cost'];
      for (const key of allowed) {
        if (req.body[key] !== undefined) {
          await GlobalSetting.upsert({ key, value: String(req.body[key]), isPublic: true, description: `AI setting: ${key}` } as any);
        }
      }
      return res.json({ message: 'AI settings updated' });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to update AI settings' });
    }
  }

  static async testAIConnection(req: Request, res: Response) {
    try {
      const result = await aiService.generateContent(
        'You are a helpful assistant. Reply with exactly: OK',
        'Test connection',
        {
          apiKey: req.body.api_key || req.body.ai_api_key,
          provider: req.body.provider || req.body.ai_provider,
          model: req.body.model || req.body.ai_model,
        }
      );
      return res.json({ success: result.success, message: result.success ? 'Connection successful' : result.error });
    } catch (error: any) {
      return res.json({ success: false, message: error.message });
    }
  }

  // ─── Product AI Operations ───

  static async translateProduct(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;

      const product = await Product.findByPk(id);
      if (!product) return res.status(404).json({ error: 'Product not found' });

      const access = await planAccessService.checkAIAccess(userId, 1);
      if (!access.allowed) {
        return res.status(403).json({ error: access.message, credits: access });
      }

      const task = await queueAITranslation(id, userId, 'translate');
      return res.json({ message: 'AI translation queued', task });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async generateContent(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;

      const product = await Product.findByPk(id);
      if (!product) return res.status(404).json({ error: 'Product not found' });

      const access = await planAccessService.checkAIAccess(userId, 1);
      if (!access.allowed) {
        return res.status(403).json({ error: access.message, credits: access });
      }

      const task = await queueAITranslation(id, userId, 'generate_content');
      return res.json({ message: 'AI content generation queued', task });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async getProductAIStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const tasks = await ProductAITask.findAll({
        where: { productId: id },
        order: [['createdAt', 'DESC']],
        limit: 10
      });
      return res.json(tasks);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async listAITasks(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const status = req.query.status as string;
      const where: any = { userId };
      if (status) where.status = status;

      const tasks = await ProductAITask.findAll({
        where,
        order: [['createdAt', 'DESC']],
        limit: 50,
        include: [{ model: Product, as: 'product', attributes: ['id', 'title', 'sku', 'category'] }]
      });
      return res.json(tasks);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  // ─── Credits ───

  static async getCreditBalance(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const balance = await planAccessService.getCreditBalance(userId);
      return res.json(balance);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async getCreditPrices(_req: Request, res: Response) {
    try {
      const pack = await GlobalSetting.findOne({ where: { key: 'ai_credit_packs' } });
      const packs = pack ? JSON.parse(pack.value) : [];
      return res.json({ packs });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async purchaseCredits(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { credits, amount } = req.body;

      if (!credits || !amount) {
        return res.status(400).json({ error: 'credits and amount are required' });
      }

      // Mock purchase (same pattern as subscription mock)
      const stripe = process.env.STRIPE_SECRET_KEY;
      if (!stripe || String(credits).startsWith('mock')) {
        await planAccessService.addPurchasedCredits(userId, Number(credits));
        return res.json({ success: true, message: `${credits} credits added to your account`, credits });
      }

      // Real Stripe checkout would go here
      return res.json({ success: true, message: `${credits} credits purchased`, credits });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  // ─── Synchronous Description Generation (no queue) ───

  static async generateDescriptionSync(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { title, category, tags } = req.body;

      if (!title || !category) {
        return res.status(400).json({ error: 'title and category are required' });
      }

      const access = await planAccessService.checkAIAccess(userId, 1);
      if (!access.allowed) {
        return res.status(403).json({ error: access.message, credits: access });
      }

      const tagsStr = Array.isArray(tags) ? tags.join(', ') : (tags || '');
      const description = await aiService.generateProductDescription(title, category, 'tr', tagsStr);

      if (!description || description === title) {
        return res.status(500).json({ error: 'AI açıklama oluşturamadı' });
      }

      await planAccessService.deductCredits(userId, 1);
      return res.json({ description });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  // ─── Synchronous All-Languages Description Generation ───

  static async generateAllDescriptionsSync(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { title, category, tags } = req.body;

      if (!title || !category) {
        return res.status(400).json({ error: 'title and category are required' });
      }

      const access = await planAccessService.checkAIAccess(userId, 2);
      if (!access.allowed) {
        return res.status(403).json({ error: access.message, credits: access });
      }

      const tagsStr = Array.isArray(tags) ? tags.join(', ') : (tags || '');
      const allDescriptions = await aiService.generateAllDescriptions(title, category, tagsStr);

      if (Object.keys(allDescriptions).length === 0) {
        return res.status(500).json({ error: 'AI açıklama oluşturamadı' });
      }

      await planAccessService.deductCredits(userId, 2);
      return res.json({ translations: allDescriptions });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  // ─── Cleanup Descriptions ───

  static async cleanupDescriptions(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { keyword, action } = req.body;

      if (!action || !['clear_matching', 'clear_all'].includes(action)) {
        return res.status(400).json({ error: 'action must be "clear_matching" or "clear_all"' });
      }

      const store = await Store.findOne({ where: { userId } });
      if (!store) return res.status(404).json({ error: 'Store not found' });
      const storeId = store.id;

      let count = 0;

      if (action === 'clear_all') {
        const products = await Product.findAll({ where: { storeId } });
        for (const p of products) {
          const pt = p as any;
          pt.description = '';
          pt.translations = pt.translations ? this.clearAllDescriptions(pt.translations) : pt.translations;
          await pt.save();
        }
        count = products.length;
      } else if (action === 'clear_matching') {
        if (!keyword) {
          return res.status(400).json({ error: 'keyword is required for clear_matching action' });
        }
        const products = await Product.findAll({
          where: {
            storeId,
            description: { [Op.iLike]: `%${keyword}%` }
          }
        });
        for (const p of products) {
          const pt = p as any;
          const desc = (p.description || '').toLowerCase();
          const kw = keyword.toLowerCase();
          pt.description = desc.includes(kw) ? '' : p.description;
          pt.translations = pt.translations ? this.clearMatchingFromTranslations(pt.translations, kw) : pt.translations;
          await pt.save();
        }
        count = products.length;
      }

      return res.json({ cleaned: count, message: `${count} ürünün açıklaması temizlendi` });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  private static clearAllDescriptions(translations: any): any {
    const result: any = {};
    for (const key of Object.keys(translations)) {
      result[key] = { ...translations[key], description: '' };
    }
    return result;
  }

  private static clearMatchingFromTranslations(translations: any, keyword: string): any {
    const result: any = {};
    for (const key of Object.keys(translations)) {
      const t = translations[key];
      const desc = (t?.description || '').toLowerCase();
      result[key] = {
        ...t,
        description: desc.includes(keyword) ? '' : (t?.description || ''),
      };
    }
    return result;
  }

  // ─── Bulk AI ───

  static async bulkAITranslate(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { productIds, taskType = 'both' } = req.body;

      if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
        return res.status(400).json({ error: 'productIds array is required' });
      }

      const access = await planAccessService.checkAIAccess(userId, productIds.length);
      if (!access.allowed) {
        return res.status(403).json({ error: access.message, credits: access });
      }

      const tasks = await queueBatchAITranslation(productIds, userId, taskType);
      return res.json({ message: `${tasks.length} products queued for AI processing`, queued: tasks.length });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}
