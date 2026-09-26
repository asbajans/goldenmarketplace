/**
 * Rating Service
 * Recalculates Product.ratingAverage / ratingCount from approved reviews.
 */

import Product from '../models/Product';
import ProductReview from '../models/ProductReview';

/**
 * Recalculate aggregates for a product from its APPROVED reviews.
 * Returns the new { ratingAverage, ratingCount }.
 */
export async function recalcProductRating(productId: string): Promise<{ ratingAverage: number; ratingCount: number }> {
  const approved = await ProductReview.findAll({
    where: { productId, isApproved: true },
    attributes: ['rating']
  });

  const ratingCount = approved.length;
  const ratingAverage = ratingCount === 0
    ? 0
    : Math.round((approved.reduce((sum, r) => sum + r.rating, 0) / ratingCount) * 100) / 100;

  await Product.update({ ratingAverage, ratingCount }, { where: { id: productId } });
  return { ratingAverage, ratingCount };
}

export default { recalcProductRating };
