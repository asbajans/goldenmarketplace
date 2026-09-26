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

const REVIEW_INCLUDES = [
  { model: Product, as: 'product', attributes: ['id', 'title', 'slug', 'sku'] }
];

export class ReviewController {
  /**
   * GET /api/reviews/product/:productId
   * Public. Approved reviews + summary { average, count }.
   */
  static async listByProduct(req: Request, res: Response) {
    try {
      const { productId } = req.params;
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

      const product = await Product.findByPk(productId, { attributes: ['id', 'ratingAverage', 'ratingCount'] });
      if (!product) return res.status(404).json({ error: 'Product not found' });

      const reviews = await ProductReview.findAll({
        where: { productId, isApproved: true },
        order: [['createdAt', 'DESC']],
        limit,
        attributes: ['id', 'reviewerName', 'rating', 'title', 'comment', 'isVerifiedPurchase', 'createdAt']
      });

      return res.json({
        summary: {
          average: Number(product.ratingAverage) || 0,
          count: product.ratingCount || 0
        },
        reviews
      });
    } catch (error) {
      console.error('Review Error [listByProduct]:', error);
      return res.status(500).json({ error: 'Failed to fetch reviews' });
    }
  }

  /**
   * POST /api/reviews/product/:productId
   * Public (logged-in or guest). Creates a PENDING review (isApproved=false).
   * Body: { rating (1-5), reviewerName, title?, comment? }
   */
  static async submit(req: Request, res: Response) {
    try {
      const { productId } = req.params;
      const { rating, reviewerName, title, comment } = req.body;

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
      if (!review) return res.status(404).json({ error: 'Review not found' });

      const productId = review.productId;
      await review.destroy();
      const summary = await recalcProductRating(productId);
      return res.json({ success: true, summary });
    } catch (error) {
      console.error('Review Error [adminDelete]:', error);
      return res.status(500).json({ error: 'Failed to delete review' });
    }
  }
}

export default ReviewController;
