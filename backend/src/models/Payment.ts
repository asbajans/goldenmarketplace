/**
 * Payment Model
 * Satıcı abonelik paketi ve AI kredi satın alımlarının ödeme kayıtları.
 * Ödeme doğrulanmadan (Stripe webhook/verify veya admin onayı) paket/kredi
 * ASLA aktifleştirilmez — pending kayıtlar bunun içindir.
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

export type PaymentKind = 'subscription' | 'credit';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'rejected' | 'cancelled';
export type PaymentProvider = 'stripe' | 'bank' | 'manual';

interface PaymentAttributes {
  id?: string;
  userId: string;
  kind: PaymentKind;
  status?: PaymentStatus;
  planId?: string | null;
  billingPeriod?: 'monthly' | 'yearly' | null;
  credits?: number | null;
  amount: number;
  currency?: string;
  provider: PaymentProvider;
  providerRef?: string | null;
  metadata?: any;
  paidAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

class Payment extends Model<PaymentAttributes> implements PaymentAttributes {
  public id!: string;
  public userId!: string;
  public kind!: PaymentKind;
  public status!: PaymentStatus;
  public planId?: string | null;
  public billingPeriod?: 'monthly' | 'yearly' | null;
  public credits?: number | null;
  public amount!: number;
  public currency!: string;
  public provider!: PaymentProvider;
  public providerRef?: string | null;
  public metadata?: any;
  public paidAt?: Date | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Payment.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' }
    },
    kind: {
      type: DataTypes.ENUM('subscription', 'credit'),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'paid', 'failed', 'rejected', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending'
    },
    planId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'subscription_plans', key: 'id' }
    },
    billingPeriod: {
      type: DataTypes.ENUM('monthly', 'yearly'),
      allowNull: true
    },
    credits: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Kredi alımlarında satın alınan kredi adedi'
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    currency: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'USD'
    },
    provider: {
      type: DataTypes.ENUM('stripe', 'bank', 'manual'),
      allowNull: false,
      comment: 'manual = admin tarafından oluşturulan/onaylanan kayıt'
    },
    providerRef: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Stripe checkout session id vb. sağlayıcı referansı'
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {}
    },
    paidAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  },
  {
    sequelize,
    tableName: 'payments',
    timestamps: true,
    indexes: [
      { name: 'idx_payments_user_status', fields: ['userId', 'status', 'createdAt'] },
      { name: 'idx_payments_provider_ref', fields: ['providerRef'] }
    ]
  }
);

export default Payment;
