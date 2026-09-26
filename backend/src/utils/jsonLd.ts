/**
 * JSON-LD builder for schema.org Product markup.
 *
 * Used by public product APIs so the storefront can embed the snippet
 * (<script type="application/ld+json">) on product landing pages.
 * Google reads aggregateRating/review from this markup — the warnings
 * disappear per product once it has at least one APPROVED review.
 *
 * Policy: aggregateRating/review are only emitted when genuine approved
 * reviews exist. Never emit fabricated ratings.
 */

const SITE_URL = process.env.SITE_URL || 'https://goldencrafters.com';

export interface JsonLdReview {
  reviewerName: string;
  rating: number;
  title?: string | null;
  comment?: string | null;
  createdAt: Date | string;
}

export interface JsonLdProductInput {
  title: string;
  description?: string | null;
  slug: string;
  sku?: string | null;
  images?: string[] | null;
  priceTRY: number | string;
  quantity?: number | null;
  storeName?: string | null;
  ratingAverage?: number | string | null;
  ratingCount?: number | string | null;
}

function stripHtml(input: string): string {
  return String(input || '').replace(/<[^>]*>/g, '').trim();
}

/**
 * Build a schema.org Product object. Returns null when the product data
 * is insufficient (should not happen for active products).
 */
export function buildProductJsonLd(
  product: JsonLdProductInput,
  approvedReviews: JsonLdReview[] = []
): Record<string, unknown> | null {
  if (!product || !product.title || !product.slug) return null;

  const price = Number(product.priceTRY) || 0;
  const inStock = Number(product.quantity) > 0;
  const storeName = product.storeName || 'Golden Crafters';
  const description = stripHtml(product.description || product.title).substring(0, 5000);
  const ratingCount = Number(product.ratingCount) || 0;
  const ratingAverage = Number(product.ratingAverage) || 0;

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description,
    url: `${SITE_URL}/p/${product.slug}`,
    image: product.images && product.images.length > 0 ? product.images : [`${SITE_URL}/images/placeholder.jpg`],
    sku: product.sku || product.slug,
    mpn: product.sku || product.slug,
    brand: { '@type': 'Brand', name: storeName },
    offers: {
      '@type': 'Offer',
      url: `${SITE_URL}/p/${product.slug}`,
      priceCurrency: 'TRY',
      price: price.toFixed(2),
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition'
    }
  };

  // Only genuine aggregates — never fabricate.
  if (ratingCount > 0 && ratingAverage > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Math.round(ratingAverage * 10) / 10,
      reviewCount: ratingCount
    };
  }

  const visible = approvedReviews
    .filter(r => r && r.rating >= 1 && r.rating <= 5)
    .slice(0, 10);
  if (visible.length > 0) {
    schema.review = visible.map(r => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: r.reviewerName || 'Doğrulanmış Alıcı' },
      datePublished: new Date(r.createdAt).toISOString().slice(0, 10),
      reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5, worstRating: 1 },
      ...(r.title ? { name: r.title } : {}),
      ...(r.comment ? { reviewBody: stripHtml(r.comment).substring(0, 5000) } : {})
    }));
  }

  return schema;
}

export default buildProductJsonLd;
