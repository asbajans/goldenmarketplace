/**
 * Review Controller
 * Public: list approved reviews + summary, submit a review (moderated).
 * Admin: list all, approve/unapprove, delete.
 */

import { Request, Response } from 'express';
import Product from '../models/Product';
import ProductReview from '../models/ProductReview';
import User from '../models/User';
import { recalcProductRating } from '../services/ratingService';
import { maskReviewerName, normalizeReviewLanguage, publicReviewJson } from '../services/reviewService';

const REVIEW_INCLUDES = [
  { model: Product, as: 'product', attributes: ['id', 'title', 'slug', 'sku'] }
];

export class ReviewController {
  /**
   * GET /api/reviews/product/:productId?lang=tr
   * Public. Approved reviews + summary { average, count }.
   * İsimler maskeli döner; ?lang ile çeviri önbellekli gösterilir.
   */
  static async listByProduct(req: Request, res: Response) {
    try {
      const { productId } = req.params;
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
      const lang = normalizeReviewLanguage(req.query.lang || 'tr');

      const product = await Product.findByPk(productId, { attributes: ['id', 'ratingAverage', 'ratingCount'] });
      if (!product) return res.status(404).json({ error: 'Product not found' });

      const reviews = await ProductReview.findAll({
        where: { productId, isApproved: true },
        order: [['createdAt', 'DESC']],
        limit,
        attributes: ['id', 'reviewerName', 'rating', 'title', 'comment', 'language', 'translations', 'isApproved', 'isVerifiedPurchase', 'createdAt']
      });

      const data = [];
      // Çeviriler paralel üretilir (seri çağrı sayfa açılışını dakikalara taşıyordu)
      const first = await Promise.all(reviews.slice(0, 10).map(r => publicReviewJson(r, lang)));
      data.push(...first);
      // Kalanlar çevirisiz (AI fatura koruması: istek başına en fazla 10 çeviri)
      for (const r of reviews.slice(10)) {
        data.push({
          id: (r as any).id,
          reviewerName: maskReviewerName((r as any).reviewerName),
          rating: (r as any).rating,
          title: (r as any).title,
          comment: (r as any).comment,
          language: normalizeReviewLanguage((r as any).language),
          originalLanguage: normalizeReviewLanguage((r as any).language),
          translated: false,
          source: (r as any).source || 'human',
          isVerifiedPurchase: !!(r as any).isVerifiedPurchase,
          createdAt: (r as any).createdAt
        });
      }

      return res.json({
        summary: {
          average: Number(product.ratingAverage) || 0,
          count: product.ratingCount || 0
        },
        reviews: data
      });
    } catch (error) {
      console.error('Review Error [listByProduct]:', error);
      return res.status(500).json({ error: 'Failed to fetch reviews' });
    }
  }

  /**
   * POST /api/reviews/product/:productId
   * Public (logged-in or guest). Creates a PENDING review (isApproved=false).
   * Body: { rating (1-5), reviewerName, title?, comment?, language? (en/tr/it/es/ar) }
   */
  static async submit(req: Request, res: Response) {
    try {
      const { productId } = req.params;
      const { rating, reviewerName, title, comment, language } = req.body;

      const product = await Product.findOne({ where: { id: productId, isActive: true } });
      if (!product) return res.status(404).json({ error: 'Product not found' });

      const stars = Number(rating);
      if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
        return res.status(400).json({ error: 'Puan 1-5 arasında tam sayı olmalıdır.' });
      }

      const user = (req as any).user;
      let name = String(reviewerName || '').trim();
      let userId: string | null = null;
      if (user?.id) {
        userId = user.id;
        const dbUser = await User.findByPk(user.id, { attributes: ['firstName', 'lastName'] } as any).catch(() => null);
        if (!name && dbUser) name = `${(dbUser as any).firstName || ''} ${(dbUser as any).lastName || ''}`.trim();
        const existing = await ProductReview.findOne({ where: { productId, userId } });
        if (existing) return res.status(409).json({ error: 'Bu ürün için zaten bir yorumunuz var.' });
      }
      if (!name) return res.status(400).json({ error: 'İsim zorunludur.' });

      const review = await ProductReview.create({
        productId,
        userId,
        reviewerName: name.substring(0, 120),
        rating: stars,
        title: title ? String(title).substring(0, 255) : null,
        comment: comment ? String(comment).substring(0, 5000) : null,
        language: normalizeReviewLanguage(language),
        source: 'human',
        isApproved: false,
        isVerifiedPurchase: false
      });

      return res.status(201).json({
        message: 'Yorumunuz alındı. Onay sonrası yayınlanacaktır.',
        review: { id: review.id, rating: review.rating, isApproved: review.isApproved }
      });
    } catch (error) {
      console.error('Review Error [submit]:', error);
      return res.status(500).json({ error: 'Failed to submit review' });
    }
  }

  /**
   * GET /api/reviews/seller — satıcının kendi ürünlerine gelen yorumlar (salt okunur).
   */
  static async sellerList(req: Request, res: Response) {
    try {
      const store = (req as any).store;
      if (!store) return res.status(400).json({ error: 'Mağaza bulunamadı' });
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const offset = (page - 1) * limit;
      const where: any = {};
      if (req.query.approved === 'true') where.isApproved = true;
      if (req.query.approved === 'false') where.isApproved = false;

      const ProductModel = require('../models/Product').default;
      const myProductIds = (await ProductModel.findAll({
        where: { storeId: store.id },
        attributes: ['id']
      })).map((p: any) => p.id);
      if (myProductIds.length === 0) {
        return res.json({ data: [], pagination: { page, limit, total: 0, pages: 0 } });
      }

      const { Op } = require('sequelize');
      const { count, rows } = await ProductReview.findAndCountAll({
        where: { ...where, productId: { [Op.in]: myProductIds } },
        include: REVIEW_INCLUDES,
        order: [['createdAt', 'DESC']],
        limit,
        offset
      });
      // Satıcıya da maskeli isim (müşteri gizliliği platform standardı)
      const data = rows.map((r: any) => {
        const json = r.toJSON ? r.toJSON() : r;
        return { ...json, reviewerName: maskReviewerName(json.reviewerName) };
      });
      return res.json({
        data,
        pagination: { page, limit, total: count, pages: Math.ceil(count / limit) }
      });
    } catch (error) {
      console.error('Review Error [sellerList]:', error);
      return res.status(500).json({ error: 'Failed to fetch reviews' });
    }
  }

  /**
   * GET /api/admin/reviews?approved=&page=&limit=&search=
   * Admin. All reviews with product info.
   */
  static async adminList(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const offset = (page - 1) * limit;
      const where: any = {};
      if (req.query.approved === 'true') where.isApproved = true;
      if (req.query.approved === 'false') where.isApproved = false;

      const { count, rows } = await ProductReview.findAndCountAll({
        where,
        include: REVIEW_INCLUDES,
        order: [['createdAt', 'DESC']],
        limit,
        offset
      });

      return res.json({
        data: rows,
        pagination: { page, limit, total: count, pages: Math.ceil(count / limit) }
      });
    } catch (error) {
      console.error('Review Error [adminList]:', error);
      return res.status(500).json({ error: 'Failed to fetch reviews' });
    }
  }

  /**
   * PUT /api/admin/reviews/:id — { isApproved?, isVerifiedPurchase? }
   * Admin. Recalcs product aggregates after change.
   */
  static async adminUpdate(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const review = await ProductReview.findByPk(id);
      if (!review) return res.status(404).json({ error: 'Review not found' });

      const patch: any = {};
      if (req.body.isApproved !== undefined) patch.isApproved = !!req.body.isApproved;
      if (req.body.isVerifiedPurchase !== undefined) patch.isVerifiedPurchase = !!req.body.isVerifiedPurchase;
      await review.update(patch);

      const summary = await recalcProductRating(review.productId);
      return res.json({ review, summary });
    } catch (error) {
      console.error('Review Error [adminUpdate]:', error);
      return res.status(500).json({ error: 'Failed to update review' });
    }
  }

  /**
   * DELETE /api/admin/reviews/:id — Admin. Recalcs aggregates.
   */
  static async adminDelete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const review = await ProductReview.findByPk(id);
      if (!review) return res.status(404).json({ error: 'Product not found' });

      const productId = review.productId;
      await review.destroy();
      const summary = await recalcProductRating(productId);
      return res.json({ success: true, summary });
    } catch (error) {
      console.error('Review Error [adminDelete]:', error);
      return res.status(500).json({ error: 'Failed to delete review' });
    }
  }

  /**
   * POST /api/admin/reviews/product/:productId/approve-all — bekleyenleri toplu onayla.
   */
  static async approveAllForProduct(req: Request, res: Response) {
    try {
      const { productId } = req.params;
      const product = await Product.findByPk(productId);
      if (!product) return res.status(404).json({ error: 'Product not found' });
      const [count] = await ProductReview.update(
        { isApproved: true } as any,
        { where: { productId, isApproved: false } }
      );
      const summary = await recalcProductRating(productId);
      return res.json({ approved: count, summary });
    } catch (error) {
      console.error('Review Error [approveAllForProduct]:', error);
      return res.status(500).json({ error: 'Failed to approve reviews' });
    }
  }

  /**
   * POST /api/admin/reviews/ai-generate — ürüne AI ile toplu yorum üret (onaysız).
   * Body: { productId, count (1-10, varsayılan 5), languages?: string[] }
   * Üretilenler isApproved=false + source='ai' gelir; yayınlanmadan önce
   * moderasyon ŞART (sahte puanın yayını Google politikasına aykırıdır).
   */
  static async aiGenerate(req: Request, res: Response) {
    try {
      const { productId } = req.body;
      const count = Math.min(Math.max(parseInt(req.body.count) || 5, 1), 10);
      const langs = Array.isArray(req.body.languages) && req.body.languages.length > 0
        ? req.body.languages.map((l: any) => normalizeReviewLanguage(l))
        : ['en', 'tr', 'it', 'es', 'ar'];

      const product = await Product.findByPk(productId);
      if (!product) return res.status(404).json({ error: 'Product not found' });

      const { default: aiService } = await import('../services/aiService');
      const readiness = await aiService.assertTranslationReady().catch(() => null);
      if (readiness) return res.status(400).json({ error: readiness });

      // Üretim kuyrukta (Bull ai-reviews): HTTP anında döner, panel durum izler.
      const { queueReviewBatch } = await import('../jobs/aiReviewJob');
      const job = await queueReviewBatch({ productId, count, langs });
      return res.json({
        message: `${count} yorum üretim kuyruğuna alındı. Tamamlanınca onay bekleyenlere düşer.`,
        batchJobId: String(job.id)
      });
    } catch (error: any) {
      console.error('Review Error [aiGenerate]:', error);
      return res.status(500).json({ error: error.message || 'Failed to queue review generation' });
    }
  }

  /**
   * GET /api/admin/reviews/ai-batch/:jobId — toplu üretim durumu.
   */
  static async aiGenerateStatus(req: Request, res: Response) {
    try {
      const { getReviewBatchStatus } = await import('../jobs/aiReviewJob');
      return res.json(await getReviewBatchStatus(req.params.jobId));
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Failed to fetch batch status' });
    }
  }
}

export default ReviewController;
