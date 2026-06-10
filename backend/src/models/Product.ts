/**
 * Product Model
 * Schema for products in the marketplace
 * Primary pricing: gramWeight × (milyem/1000) × 24K gold gram price
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

interface ProductAttributes {
  id?: string;
  storeId: string;
  title: string;
  slug: string;
  description?: string;
  category: string;
  categoryId?: string;
  sku: string;
  gramWeight: number;
  milyem: number;
  effectiveMilyem?: number;
  gramHas?: number;
  profitMargin: number;
  priceMultiplier?: number;
  priceTRY: number;
  priceUSD: number;
  isB2BEnabled: boolean;
  b2bDiscount: number;
  b2bPrice: number;
  discountRate: number;
  discountedPrice: number;
  quantity: number;
  images: string[];
  videos?: string[];
  videoUrl?: string;
  marketplaces?: string[];
  hasVariants: boolean;
  variantAttributes?: any;
  marketplaceConfig?: any;
  tags?: string[];
  originalStoreName?: string;
  originalProductId?: string;
  feedSourceId?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

class Product extends Model<ProductAttributes> implements ProductAttributes {
  public id!: string;
  public storeId!: string;
  public title!: string;
  public slug!: string;
  public description?: string;
  public category!: string;
  public categoryId?: string;
  public translations?: any;
  public defaultLanguage?: string;
  public sku!: string;
  public gramWeight!: number;
  public milyem!: number;
  public effectiveMilyem?: number;
  public gramHas?: number;
  public profitMargin!: number;
  public priceMultiplier!: number;
  public priceTRY!: number;
  public priceUSD!: number;
  public isB2BEnabled!: boolean;
  public b2bDiscount!: number;
  public b2bPrice!: number;
  public discountRate!: number;
  public discountedPrice!: number;
  public quantity!: number;
  public images!: string[];
  public videos?: string[];
  public videoUrl?: string;
  public marketplaces?: string[];
  public hasVariants!: boolean;
  public variantAttributes?: any;
  public marketplaceConfig?: any;
  public tags?: string[];
  public originalStoreName?: string;
  public originalProductId?: string;
  public feedSourceId?: string;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Product.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    storeId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'stores',
        key: 'id'
      }
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    slug: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false
    },
    categoryId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'categories', key: 'id' }
    },
    // @ts-ignore - translations column will be added via migration
    translations: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      comment: 'Multi-language translations: { en: { title, description }, tr: {...}, it: {...}, ar: {...} }'
    },
    // @ts-ignore - defaultLanguage column will be added via migration
    defaultLanguage: {
      type: DataTypes.STRING(10),
      allowNull: true,
      defaultValue: 'en',
      comment: 'Default language for product (en, tr, it, ar)'
    },
    sku: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    gramWeight: {
      type: DataTypes.DECIMAL(15, 4),
      allowNull: false,
      comment: 'Product weight in grams'
    },
    milyem: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Gold fineness of the alloy (333=8K, 585=14K, 750=18K, 916=22K, 999=24K)'
    },
    effectiveMilyem: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Labor+profit-adjusted effective milyem used for pure-gold pricing (>=milyem)'
    },
    gramHas: {
      type: DataTypes.DECIMAL(10, 4),
      allowNull: true,
      comment: 'Calculated: gramWeight x effectiveMilyem/1000'
    },
    profitMargin: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Profit margin percentage applied on top of gold price'
    },
    priceMultiplier: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 1.00,
      comment: 'Price multiplier applied after profit margin (1.0 = no multiplier)'
    },
    priceTRY: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Calculated: gramWeight × (milyem/1000) × 24K gram TRY'
    },
    priceUSD: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Calculated: priceTRY / USD-TRY rate'
    },
    isB2BEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'When true, product is visible in B2B marketplace discovery'
    },
    b2bDiscount: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'B2B discount percentage off priceTRY'
    },
    b2bPrice: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Calculated: priceTRY × (1 - b2bDiscount/100)'
    },
    discountRate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: null,
      comment: 'Discount percentage for golden marketplace'
    },
    discountedPrice: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      defaultValue: null,
      comment: 'Calculated: priceTRY × (1 - discountRate/100)'
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    images: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    videos: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    videoUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    marketplaces: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    hasVariants: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    variantAttributes: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
      comment: 'Array of variant configurations. e.g. [{"name": "Renk", "options": ["Sarı", "Beyaz"]}]'
    },
    marketplaceConfig: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      comment: 'JSON object storing marketplace-specific settings per product, e.g. {"etsy": {"shippingProfileId": "123"}}'
    },
    tags: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    originalStoreName: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'If cloned from B2B, tracks original stock owner name'
    },
    originalProductId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Reference to the B2B supplier product for automatic pricing & stock sync'
    },
    feedSourceId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Reference to the external feed this product was imported from'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  },
  {
    sequelize,
    tableName: 'products',
    timestamps: true,
    indexes: [
      // B2B discovery: main query filter
      {
        name: 'idx_products_b2b_active',
        fields: ['isB2BEnabled', 'isActive', 'storeId', 'createdAt']
      },
      // Store page query
      {
        name: 'idx_products_store_active',
        fields: ['storeId', 'isActive', 'isB2BEnabled']
      },
      // Admin search queries
      {
        name: 'idx_products_store_created',
        fields: ['storeId', 'createdAt']
      },
      // Clone sync lookup
      {
        name: 'idx_products_original_product',
        fields: ['originalProductId']
      }
    ]
  }
);

// Hooks: keep Store.totalProducts in sync (use require to avoid circular dep)
Product.afterCreate(async (product) => {
  try {
    const Store = require('./Store').default;
    await Store.increment('totalProducts', { by: 1, where: { id: product.storeId } });
  } catch (err) {
    console.error('[Product Hook] afterCreate increment error:', err);
  }
});

Product.afterDestroy(async (product) => {
  try {
    const Store = require('./Store').default;
    await Store.decrement('totalProducts', { by: 1, where: { id: product.storeId } });
  } catch (err) {
    console.error('[Product Hook] afterDestroy decrement error:', err);
  }
});

Product.afterUpdate(async (product) => {
  try {
    const prev = (product as any)._previousDataValues;
    if (prev && prev.isActive !== product.isActive) {
      const Store = require('./Store').default;
      if (prev.isActive && !product.isActive) {
        await Store.decrement('totalProducts', { by: 1, where: { id: product.storeId } });
      } else if (!prev.isActive && product.isActive) {
        await Store.increment('totalProducts', { by: 1, where: { id: product.storeId } });
      }
    }
  } catch (err) {
    console.error('[Product Hook] afterUpdate error:', err);
  }
});

export default Product;
