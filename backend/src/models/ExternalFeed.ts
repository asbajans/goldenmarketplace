import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

interface ExternalFeedAttributes {
  id?: string;
  storeId: string;
  name: string;
  feedUrl: string;
  fileFormat: 'xml' | 'csv' | 'xlsx' | 'json';
  authType: 'none' | 'basic' | 'bearer' | 'api-key';
  authCredentials?: any;
  pricingMode: 'fixed' | 'gold-formula';
  currency: 'TRY' | 'USD';
  defaultGramWeight?: number;
  defaultMilyem?: number;
  defaultProfitMargin?: number;
  priceMultiplier: number;
  defaultCategory?: string;
  defaultIsB2BEnabled?: boolean;
  defaultQuantity?: number;
  defaultMarketplaces?: string[];
  fieldMapping?: any;
  autoSync: boolean;
  updateInterval: 'manual' | 'hourly' | 'daily' | 'weekly';
  lastSyncAt?: Date;
  lastSyncResult?: any;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

class ExternalFeed extends Model<ExternalFeedAttributes> implements ExternalFeedAttributes {
  public id!: string;
  public storeId!: string;
  public name!: string;
  public feedUrl!: string;
  public fileFormat!: 'xml' | 'csv' | 'xlsx' | 'json';
  public authType!: 'none' | 'basic' | 'bearer' | 'api-key';
  public authCredentials?: any;
  public pricingMode!: 'fixed' | 'gold-formula';
  public currency!: 'TRY' | 'USD';
  public defaultGramWeight?: number;
  public defaultMilyem?: number;
  public defaultProfitMargin?: number;
  public priceMultiplier!: number;
  public defaultCategory?: string;
  public defaultIsB2BEnabled?: boolean;
  public defaultQuantity?: number;
  public defaultMarketplaces?: string[];
  public fieldMapping?: any;
  public autoSync!: boolean;
  public updateInterval!: 'manual' | 'hourly' | 'daily' | 'weekly';
  public lastSyncAt?: Date;
  public lastSyncResult?: any;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ExternalFeed.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    storeId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'stores', key: 'id' }
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    feedUrl: {
      type: DataTypes.STRING,
      allowNull: false
    },
    fileFormat: {
      type: DataTypes.ENUM('xml', 'csv', 'xlsx', 'json'),
      allowNull: false,
      defaultValue: 'xml'
    },
    authType: {
      type: DataTypes.ENUM('none', 'basic', 'bearer', 'api-key'),
      allowNull: false,
      defaultValue: 'none'
    },
    authCredentials: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null
    },
    pricingMode: {
      type: DataTypes.ENUM('fixed', 'gold-formula'),
      allowNull: false,
      defaultValue: 'fixed'
    },
    currency: {
      type: DataTypes.ENUM('TRY', 'USD'),
      allowNull: false,
      defaultValue: 'TRY'
    },
    defaultGramWeight: {
      type: DataTypes.DECIMAL(10, 4),
      allowNull: true
    },
    defaultMilyem: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    defaultProfitMargin: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: 0
    },
    priceMultiplier: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 1.00
    },
    defaultCategory: {
      type: DataTypes.STRING,
      allowNull: true
    },
    defaultIsB2BEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },
    defaultQuantity: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1
    },
    defaultMarketplaces: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: ['golden']
    },
    fieldMapping: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {}
    },
    autoSync: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    updateInterval: {
      type: DataTypes.ENUM('manual', 'hourly', 'daily', 'weekly'),
      allowNull: false,
      defaultValue: 'manual'
    },
    lastSyncAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    lastSyncResult: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  },
  {
    sequelize,
    tableName: 'external_feeds',
    timestamps: true,
    indexes: [
      { name: 'idx_external_feeds_store', fields: ['storeId'] }
    ]
  }
);

export default ExternalFeed;
