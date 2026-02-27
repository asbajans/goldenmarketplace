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
  sku: string;
  gramWeight: number;
  milyem: number;
  priceTRY: number;
  priceUSD: number;
  quantity: number;
  images: string[];
  videoUrl?: string;
  marketplaces?: string[];
  tags?: string[];
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
  public sku!: string;
  public gramWeight!: number;
  public milyem!: number;
  public priceTRY!: number;
  public priceUSD!: number;
  public quantity!: number;
  public images!: string[];
  public videoUrl?: string;
  public marketplaces?: string[];
  public tags?: string[];
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
      comment: 'Gold fineness (333=8K, 585=14K, 750=18K, 916=22K, 999=24K)'
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
    videoUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    marketplaces: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    tags: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  },
  {
    sequelize,
    tableName: 'products',
    timestamps: true
  }
);

export default Product;
