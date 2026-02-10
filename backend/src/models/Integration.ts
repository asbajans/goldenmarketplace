/**
 * Integration Model
 * Track marketplace integrations for each seller
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

interface IntegrationAttributes {
  id?: string;
  storeId: string;
  marketplace: string;
  isConnected: boolean;
  apiKey?: string;
  apiSecret?: string;
  shopId?: string;
  lastSyncDate?: Date;
  syncStatus: 'pending' | 'in-progress' | 'completed' | 'failed';
  errorMessage?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

class Integration extends Model<IntegrationAttributes> implements IntegrationAttributes {
  public id!: string;
  public storeId!: string;
  public marketplace!: string;
  public isConnected!: boolean;
  public apiKey?: string;
  public apiSecret?: string;
  public shopId?: string;
  public lastSyncDate?: Date;
  public syncStatus!: 'pending' | 'in-progress' | 'completed' | 'failed';
  public errorMessage?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Integration.init(
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
    marketplace: {
      type: DataTypes.STRING,
      allowNull: false
    },
    isConnected: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    apiKey: {
      type: DataTypes.STRING,
      allowNull: true
    },
    apiSecret: {
      type: DataTypes.STRING,
      allowNull: true
    },
    shopId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    lastSyncDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    syncStatus: {
      type: DataTypes.ENUM('pending', 'in-progress', 'completed', 'failed'),
      allowNull: false,
      defaultValue: 'pending'
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  },
  {
    sequelize,
    tableName: 'integrations',
    timestamps: true
  }
);

export default Integration;
