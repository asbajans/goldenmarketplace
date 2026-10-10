/**
 * Validation Utilities
 * Input validation and sanitization
 */

import Joi from 'joi';

export const schemas = {
  register: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    firstName: Joi.string().required(),
    lastName: Joi.string().allow(''),
    userType: Joi.string().valid('seller', 'customer', 'admin'),
    phone: Joi.string().allow('', null),
    storeName: Joi.string().allow('', null)
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  createStore: Joi.object({
    storeName: Joi.string().required(),
    storeSlug: Joi.string().required(),
    description: Joi.string()
  }),

  createProduct: Joi.object({
    title: Joi.string().required(),
    description: Joi.string().allow('', null),
    category: Joi.string().required(),
    sku: Joi.string().required(),
    pricingType: Joi.string().valid('gold', 'fixed').allow(null),
    gramWeight: Joi.number().positive().allow(null),
    milyem: Joi.number().valid(333, 585, 750, 916, 999).allow(null),
    priceTRY: Joi.number().min(0).allow(null),
    quantity: Joi.number().integer().min(0).required(),
    profitMargin: Joi.number().min(0).allow(null),
    tags: Joi.array().items(Joi.string()).allow(null),
    images: Joi.array().items(Joi.string()).allow(null),
    videoUrl: Joi.string().allow('', null),
    marketplaces: Joi.array().items(Joi.string()).allow(null)
  }).unknown(),

  createSubscription: Joi.object({
    marketplace: Joi.string().required(),
    plan: Joi.string().valid('basic', 'professional', 'enterprise').required(),
    paymentMethodId: Joi.string()
  })
};

export const validateRequest = (schema: Joi.Schema) => {
  return (req: any, res: any, next: any) => {
    const { error, value } = schema.validate(req.body);

    if (error) {
      console.error('Validation Error:', error.details[0].message);
      return res.status(400).json({
        error: {
          message: error.details[0].message,
          status: 400
        }
      });
    }

    req.validatedBody = value;
    next();
  };
};

/**
 * Feed'den gelen açıklamayı düz metne çevirir.
 * Kaynaklar (öz. Word'den kopyalanmış içerik) `<p class="MsoNormal">`,
 * `<o:p>`, inline style/class gibi HTML artıkları içerir; sitede ham
 * etiket olarak görünür. Yeni bağımlılık yok: blok kapanışları satır
 * sonuna çevrilir, kalan tüm tag'ler ve yaygın entity'ler temizlenir.
 */
export const cleanFeedDescription = (html: unknown): string => {
  if (html === null || html === undefined) return '';
  let text = String(html);
  if (!text) return '';

  // Blok kapanışları ve <br> → satır sonu (metinler bitişmesin)
  text = text.replace(/<\/(p|div|li|ul|ol|tr|table|h[1-6]|blockquote)>/gi, '\n');
  text = text.replace(/<br\s*\/?>/gi, '\n');
  // Tüm kalan tag'ler (MsoNormal sarmalayıcıları, o:p, span ve class/style attribute'ları dahil)
  text = text.replace(/<[^>]*>/g, '');
  // Yaygın HTML entity'leri
  text = text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&amp;/gi, '&');
  // Satır başına boşlukları kırp, boş satırları at, çoklu boşlukları tekle
  text = text
    .split('\n')
    .map((line) => line.replace(/[ \t\u00a0]+/g, ' ').replace(/^\s+|\s+$/g, ''))
    .filter((line) => line.length > 0)
    .join('\n');

  return text;
};
