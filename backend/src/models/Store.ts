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
  autoPriceSync?: boolean;
  defaultLanguage?: string;
  openAiApiKey?: string;
  merchantCenterId?: string;
  merchantTargetCountry?: string;
  merchantTargetLanguage?: string;
  commissionRate: number;
  defaultShippingDays: number;
  availableShippingCompanies?: string[];
  bankName?: string;
  iban?: string;
  accountNumber?: string;
  accountHolder?: string;
  branchCode?: string;
  cryptoWallet?: string;
  paymentMethods?: { stripe: boolean; bankTransfer: boolean; crypto: boolean };
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
  public autoPriceSync!: boolean;
  public commissionRate!: number;
  public defaultShippingDays!: number;
  public availableShippingCompanies?: string[];
  public bankName?: string;
  public iban?: string;
  public accountNumber?: string;
  public accountHolder?: string;
  public branchCode?: string;
  public cryptoWallet?: string;
  public paymentMethods?: { stripe: boolean; bankTransfer: boolean; crypto: boolean };
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
    autoPriceSync: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'If true, product prices sync automatically with global gold price'
    },
    defaultLanguage: {
      type: DataTypes.STRING(10),
      allowNull: true,
      defaultValue: 'en',
      comment: 'Default language for store (en, tr, it, ar)'
    },
    openAiApiKey: {
      type: DataTypes.STRING(256),
      allowNull: true,
      comment: 'Seller own OpenAI API key for AI translations'
    },
    merchantCenterId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Google Merchant Center ID for this store'
    },
    merchantTargetCountry: {
      type: DataTypes.STRING(10),
      allowNull: true,
      defaultValue: 'TR',
      comment: 'Target country for Google Shopping feed'
    },
    merchantTargetLanguage: {
      type: DataTypes.STRING(10),
      allowNull: true,
      defaultValue: 'tr',
      comment: 'Target language for Google Shopping feed'
    },
    commissionRate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: null,
      comment: 'Commission percentage for this seller (default 10%)'
    },
    defaultShippingDays: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: 'Default shipping time in days'
    },
    availableShippingCompanies: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
      comment: 'Available shipping companies for this seller'
    },
    bankName: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'bankname',
      comment: 'Bank account name for bank transfers'
    },
    iban: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'iban',
      comment: 'IBAN for bank transfers'
    },
    accountNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'accountnumber',
      comment: 'Bank account number'
    },
    accountHolder: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'accountholder',
      comment: 'Account holder name'
    },
    branchCode: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'branchcode',
      comment: 'Bank branch code'
    },
    cryptoWallet: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'cryptowallet',
      comment: 'USDT TRC20 wallet address'
    },
    paymentMethods: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'paymentmethods',
      defaultValue: { stripe: true, bankTransfer: false, crypto: false },
      comment: 'Enabled payment methods'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  },
  {
    sequelize,
    tableName: 'stores',
    timestamps: true,
    indexes: [
      { name: 'idx_stores_slug', unique: true, fields: ['storeSlug'] },
      { name: 'idx_stores_user', unique: true, fields: ['userId'] },
      { name: 'idx_stores_active', fields: ['isActive'] }
    ]
  }
);

export default Store;
