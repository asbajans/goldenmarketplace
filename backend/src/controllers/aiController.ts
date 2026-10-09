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
        where: { key: ['ai_provider', 'ai_api_key', 'ai_model', 'ai_image_model', 'ai_credit_packs', 'ai_translation_cost', 'ai_content_cost'] }
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
      const allowed = ['ai_provider', 'ai_api_key', 'ai_model', 'ai_image_model', 'ai_credit_packs', 'ai_translation_cost', 'ai_content_cost'];
      // ai_api_key is a SECRET — it must never be served on public endpoints.
      const PRIVATE_KEYS = new Set(['ai_api_key']);
      for (const key of allowed) {
        if (req.body[key] !== undefined) {
          await GlobalSetting.upsert({ key, value: String(req.body[key]), isPublic: !PRIVATE_KEYS.has(key), description: `AI setting: ${key}` } as any);
        }
      }
      // Repair: if a previous save exposed the secret, make it private again.
      await GlobalSetting.update({ isPublic: false }, { where: { key: 'ai_api_key' } }).catch(() => undefined);
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
      const { getCreditPacks } = require('../services/paymentService');
      const packs = await getCreditPacks();
      return res.json({ packs });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Kredi checkout: fiyat adminin tanımladığı paketten gelir (istemci
   * tutarı güvenilmez). Stripe → ödeme URL'i, havale → bekleyen talep.
   * Kredi, ödeme doğrulanınca (webhook/verify veya admin onayı) bakiyeye
   * eklenir — öncesinde ASLA.
   */
  static async checkoutCredits(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { credits, provider = 'bank' } = req.body;

      if (!credits) {
        return res.status(400).json({ error: 'credits gerekli' });
      }
      if (!['stripe', 'bank'].includes(provider)) {
        return res.status(400).json({ error: 'provider stripe|bank olmalı' });
      }

      const { createCreditCheckout } = require('../services/paymentService');
      const { payment, url, bank } = await createCreditCheckout(userId, Number(credits), provider);
      return res.json({
        paymentId: payment.id,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        credits: payment.credits,
        url,
        bank: bank || undefined,
        message: url
          ? 'Ödeme sayfasına yönlendiriliyorsunuz'
          : 'Talebiniz alındı. Havale/EFT sonrası admin onayıyla kredileriniz yüklenecek.'
      });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  // ─── Synchronous Description Generation (no queue) ───

  static async generateDescriptionSync(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { title, category, tags, language } = req.body;

      if (!title || !category) {
        return res.status(400).json({ error: 'title and category are required' });
      }

      const access = await planAccessService.checkAIAccess(userId, 1);
      if (!access.allowed) {
        return res.status(403).json({ error: access.message, credits: access });
      }

      // Modal hangi dil sekmesindeyse o dilde üret (eski davranış: hep Türkçe).
      const targetLanguage = AIController.resolveLanguageName(language) || 'Turkish';
      const tagsStr = Array.isArray(tags) ? tags.join(', ') : (tags || '');
      const description = await aiService.generateProductDescription(title, category, targetLanguage, tagsStr);

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

  /**
   * Dil kodu ("en") veya dil adı ("English") → AI prompt'unda kullanılacak
   * İngilizce dil adı. Bilinmeyen değerde null döner (çağıran varsayılanı seçer).
   */
  private static resolveLanguageName(input: unknown): string | null {
    if (input === undefined || input === null) return null;
    const v = String(input).trim();
    if (!v) return null;
    const byCode: Record<string, string> = {
      en: 'English', tr: 'Turkish', it: 'Italian', es: 'Spanish', ar: 'Arabic',
      de: 'German', fr: 'French', pt: 'Portuguese', ru: 'Russian', zh: 'Chinese'
    };
    const lower = v.toLowerCase();
    if (byCode[lower]) return byCode[lower];
    const names = Object.values(byCode).map(n => n.toLowerCase());
    if (names.includes(lower)) return v;
    return null;
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
          pt.translations = pt.translations ? AIController.clearAllDescriptions(pt.translations) : pt.translations;
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
          pt.translations = pt.translations ? AIController.clearMatchingFromTranslations(pt.translations, kw) : pt.translations;
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

      // Kuyruğa almadan önce sağlayıcıyı kontrol et — anahtar yoksa
      // sahte "başarılı" dönüp sessiz kalma.
      const providerInfo = await aiService.getProviderInfo();
      if (!providerInfo.configured) {
        return res.status(400).json({
          error: 'AI API anahtarı tanımlı değil. Admin → Sistem Ayarları → AI bölümünden API anahtarını girin.'
        });
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

  // ─── Admin Blog Generation (all site languages) ───

  static async generateBlogPost(req: Request, res: Response) {
    try {
      const { topic, productId, tone = 'warm, expert and trustworthy' } = req.body;

      if (!topic && !productId) {
        return res.status(400).json({ error: 'topic or productId is required' });
      }

      let context = '';
      let productUrl = '';
      let productImageUrl = '';
      // Per-locale product page URL builder (assigned when a product is used).
      let productUrlFor = (_lang: string) => productUrl;
      if (productId) {
        const product: any = await Product.findByPk(productId);
        if (!product) {
          return res.status(404).json({ error: 'Product not found' });
        }
        // Prices: ALWAYS the discounted sale price, in TRY and in USD.
        const priceTRY = parseFloat(product.priceTRY) || 0;
        const discountRate = parseFloat(product.discountRate) || 0;
        const saleTRY = discountRate > 0
          ? Math.round(priceTRY * (1 - discountRate / 100) * 100) / 100
          : priceTRY;
        let saleUSD = parseFloat(product.priceUSD) || 0;
        if (discountRate > 0) saleUSD = Math.round(saleUSD * (1 - discountRate / 100) * 100) / 100;
        if (!saleUSD) {
          try {
            const goldPriceService = require('../services/goldPriceService').default;
            const gold = await goldPriceService.getCurrentGoldPrice();
            if (gold?.usdTryRate > 0) saleUSD = Math.round((saleTRY / gold.usdTryRate) * 100) / 100;
          } catch { /* USD optional */ }
        }
        const priceLine = discountRate > 0
          ? `Sale price: ${saleTRY} TRY (approx $${saleUSD} USD) — ${discountRate}% OFF the regular ${priceTRY} TRY`
          : `Price: ${saleTRY} TRY (approx $${saleUSD} USD)`;
        const slugPart = encodeURIComponent(String(product.slug || product.id));
        productUrlFor = (lang: string) => `https://www.goldencrafters.com/${lang}/p/${slugPart}`;
        productUrl = productUrlFor('en');
        const images: any[] = Array.isArray(product.images) ? product.images : [];
        productImageUrl = images[0] || '';
        context = `Feature this product naturally inside the article (one section about it, plus mention its price in BOTH Turkish lira and US dollars exactly as given):\n- Name: ${product.title}\n- Category: ${product.category || ''}\n- ${priceLine}\n- Description: ${(product.description || '').slice(0, 800)}`;
      }

      // 1) Draft in English, strict JSON (plain-text paragraphs, no HTML/markdown)
      const draftRes = await aiService.generateContent(
        `You are an expert jewelry journalist writing for Golden Crafters, a fine gold jewelry marketplace.
Write in English with a ${tone} tone. Audience: jewelry shoppers and gold enthusiasts.
Whenever a product price is given, quote it in both TRY and USD exactly as provided.
Return ONLY a JSON object (no code fences, no extra text) with exactly these keys:
{ "title": "catchy SEO title, max 70 chars", "excerpt": "1-2 sentence teaser, max 200 chars", "content": "full article, 300-500 words, plain text paragraphs separated by blank lines, no HTML, no markdown" }`,
        `Article topic: ${topic || 'gold jewelry'}\n${context}`
      );
      if (!draftRes.success || !draftRes.content) {
        return res.status(500).json({ error: draftRes.error || 'AI could not generate the article' });
      }

      let draft: { title: string; excerpt: string; content: string };
      try {
        const cleaned = draftRes.content.replace(/```json|```/g, '').trim();
        draft = JSON.parse(cleaned);
      } catch {
        return res.status(500).json({ error: 'AI returned an unparseable article, please try again' });
      }
      if (!draft.title || !draft.content) {
        return res.status(500).json({ error: 'AI returned an incomplete article, please try again' });
      }

      // 2) Translate to every site language (fields translated in parallel)
      // AND generate the cover image concurrently — the request must finish
      // well under reverse-proxy timeouts, so nothing independent waits.
      const LANG_NAMES: Record<string, string> = { tr: 'Turkish', it: 'Italian', es: 'Spanish', ar: 'Arabic' };
      const translations: Record<string, { title: string; excerpt: string; content: string }> = {
        en: { title: draft.title, excerpt: draft.excerpt || '', content: draft.content }
      };
      let imageUrl = '';
      let imageError = '';
      const translateAll = Promise.all(Object.entries(LANG_NAMES).map(async ([lang, name]) => {
        const [tTitle, tExcerpt, tContent] = await Promise.all([
          aiService.translateText(draft.title, name),
          draft.excerpt ? aiService.translateText(draft.excerpt, name) : Promise.resolve(''),
          aiService.translateText(draft.content, name)
        ]);
        translations[lang] = { title: tTitle, excerpt: tExcerpt, content: tContent };
      }));
      const generateCover = (async () => {
        try {
          const imgPrompt = topic
            ? `${topic}, elegant gold jewelry theme`
            : `elegant gold jewelry showcase`;
          const img = await aiService.generateImage(imgPrompt);
          if (img.success && img.dataUrl) {
            const { s3Service } = require('../services/s3Service');
            imageUrl = await s3Service.uploadBase64Image(img.dataUrl, 'blog');
          } else if (img.error) {
            imageError = img.error;
          }
        } catch (imgErr: any) {
          imageError = imgErr?.message || 'Image upload failed';
        }
      })();
      await Promise.all([translateAll, generateCover]);

      // 3) Featured-product CTA appended AFTER translation (static templates,
      // so the product URL can never be mangled by the translator).
      if (productId && productUrl) {
        const CTA: Record<string, string> = {
          en: 'Featured in this article',
          tr: 'Bu yazıda öne çıkan ürün',
          it: 'In evidenza in questo articolo',
          es: 'Destacado en este artículo',
          ar: 'منتج مميز في هذه المقالة'
        };
        const VIEW: Record<string, string> = {
          en: 'View product', tr: 'Ürünü incele', it: 'Vedi il prodotto',
          es: 'Ver el producto', ar: 'عرض المنتج'
        };
        for (const lang of Object.keys(translations)) {
          const t = translations[lang];
          const url = productUrlFor(lang);
          t.content = `${t.content}\n\n${CTA[lang] || CTA.en}: ${url}\n${VIEW[lang] || VIEW.en}: ${url}`;
        }
      }

      // 4) Suggest a slug unique among existing blog posts
      const slugBase = draft.title.toLowerCase().normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'blog-post';
      let slug = slugBase;
      try {
        const row = await GlobalSetting.findOne({ where: { key: 'blog_posts' } });
        const existingSlugs = new Set<string>();
        if (row?.value) {
          const posts = JSON.parse(row.value);
          if (Array.isArray(posts)) for (const p of posts) if (p?.slug) existingSlugs.add(p.slug);
        }
        let n = 2;
        while (existingSlugs.has(slug)) slug = `${slugBase}-${n++}`;
      } catch { /* slug stays as-is */ }

      return res.json({ slug, translations, imageUrl, imageError, productUrl, productImageUrl });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}
