/**
 * Product Model
 * Schema for products in the marketplace
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
  basePrice: number;
  goldIndexPrice: number;
  currency: string;
  quantity: number;
  images: string[];
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
  public basePrice!: number;
  public goldIndexPrice!: number;
  public currency!: string;
  public quantity!: number;
  public images!: string[];
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
    basePrice: {
      type: DataTypes.DECIMAL(15, 4),
      allowNull: false
    },
    goldIndexPrice: {
      type: DataTypes.DECIMAL(15, 4),
      allowNull: false
    },
    currency: {
      type: DataTypes.STRING,
      defaultValue: 'XAU' // Gold ounces
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
