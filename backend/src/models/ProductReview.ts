/**
 * ProductReview Model
 * Customer reviews for products. Only approved reviews are public and
 * feed into Product.ratingAverage / ratingCount, JSON-LD snippets and
 * the Google Product Ratings feed.
 *
 * NOTE: Reviews must be genuine (visible on the landing page). Fabricating
 * ratings violates Google's policies and risks Merchant Center suspension,
 * so there are intentionally no "default" ratings.
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

interface ProductReviewAttributes {
  id?: string;
  productId: string;
  userId?: string | null;
  reviewerName: string;
  rating: number;
  title?: string | null;
  comment?: string | null;
  language?: string;
  translations?: any;
  source?: string;
  isApproved: boolean;
  isVerifiedPurchase: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

class ProductReview extends Model<ProductReviewAttributes> implements ProductReviewAttributes {
  public id!: string;
  public productId!: string;
  public userId?: string | null;
  public reviewerName!: string;
  public rating!: number;
  public title?: string | null;
  public comment?: string | null;
  public language!: string;
  public translations?: any;
  public source!: string;
  public isApproved!: boolean;
  public isVerifiedPurchase!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ProductReview.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'products', key: 'id' }
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      comment: 'Reviewer account, if logged in (guest reviews have NULL + reviewerName)'
    },
    reviewerName: {
      type: DataTypes.STRING(120),
      allowNull: false
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1, max: 5 },
      comment: 'Star rating 1-5'
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    language: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: 'tr',
      comment: 'Yorumun yazıldığı dil (en, tr, it, es, ar)'
    },
    translations: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      comment: 'Okuma anında önbelleğe alınan çeviriler: { en: { title, comment }, ... }'
    },
    source: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'human',
      comment: 'human = müşteri, ai = admin AI üretimi (onaylanmadan yayınlanmaz)'
    },
    isApproved: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Admin moderation flag. Only approved reviews are public.'
    },
    isVerifiedPurchase: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'True when the reviewer actually purchased the product'
    }
  },
  {
    sequelize,
    tableName: 'product_reviews',
    timestamps: true,
    indexes: [
      { name: 'idx_reviews_product_approved', fields: ['productId', 'isApproved', 'createdAt'] },
      { name: 'idx_reviews_user_product', fields: ['userId', 'productId'] }
    ]
  }
);

export default ProductReview;
