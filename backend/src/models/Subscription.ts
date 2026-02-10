/**
 * Subscription Model
 * Track seller subscriptions and packages
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

interface SubscriptionAttributes {
  id?: string;
  userId: string;
  marketplace: string; // etsy, amazon, hepsiburada, etc.
  plan: 'basic' | 'professional' | 'enterprise';
  stripeSubscriptionId?: string;
  status: 'active' | 'cancelled' | 'expired';
  startDate: Date;
  endDate?: Date;
  price: number;
  currency: string;
  createdAt?: Date;
  updatedAt?: Date;
}

class Subscription extends Model<SubscriptionAttributes> implements SubscriptionAttributes {
  public id!: string;
  public userId!: string;
  public marketplace!: string;
  public plan!: 'basic' | 'professional' | 'enterprise';
  public stripeSubscriptionId?: string;
  public status!: 'active' | 'cancelled' | 'expired';
  public startDate!: Date;
  public endDate?: Date;
  public price!: number;
  public currency!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Subscription.init(
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
    marketplace: {
      type: DataTypes.STRING,
      allowNull: false
    },
    plan: {
      type: DataTypes.ENUM('basic', 'professional', 'enterprise'),
      allowNull: false,
      defaultValue: 'basic'
    },
    stripeSubscriptionId: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },
    status: {
      type: DataTypes.ENUM('active', 'cancelled', 'expired'),
      allowNull: false,
      defaultValue: 'active'
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    currency: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'USD'
    }
  },
  {
    sequelize,
    tableName: 'subscriptions',
    timestamps: true
  }
);

export default Subscription;
