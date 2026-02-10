/**
 * Store Model
 * Schema for seller stores
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

interface StoreAttributes {
  id?: string;
  userId: string;
  storeName: string;
  storeSlug: string;
  description?: string;
  logo?: string;
  banner?: string;
  rating: number;
  totalProducts: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

class Store extends Model<StoreAttributes> implements StoreAttributes {
  public id!: string;
  public userId!: string;
  public storeName!: string;
  public storeSlug!: string;
  public description?: string;
  public logo?: string;
  public banner?: string;
  public rating!: number;
  public totalProducts!: number;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Store.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    storeName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    storeSlug: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    logo: {
      type: DataTypes.STRING,
      allowNull: true
    },
    banner: {
      type: DataTypes.STRING,
      allowNull: true
    },
    rating: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
      validate: { min: 0, max: 5 }
    },
    totalProducts: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  },
  {
    sequelize,
    tableName: 'stores',
    timestamps: true
  }
);

export default Store;
