/**
 * ReturnRequest Model
 * Customer return flow (matches the public Return & Refund Policy):
 * pending → approved/rejected → shipped → inspected → refunded
 * (customer may cancel while pending).
 *
 * The SELLER owns approval/inspection/refund steps; the platform only
 * supervises. Order status flips to 'returned' on full-order refunds.
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

export type ReturnStatus =
  | 'pending' | 'approved' | 'rejected'
  | 'shipped' | 'inspected' | 'refunded' | 'cancelled';

export type ReturnReason =
  | 'withdrawal' | 'defective' | 'wrong' | 'incomplete' | 'other';

interface ReturnRequestAttributes {
  id?: string;
  orderId: string;
  orderItemId?: string | null;
  productId: string;
  storeId: string;
  customerId: string;
  sellerId: string;
  reason: ReturnReason;
  customerNote?: string | null;
  quantity?: number;
  refundAmount?: number | null;
  status?: ReturnStatus;
  sellerNote?: string | null;
  returnAddress?: string | null;
  trackingNumber?: string | null;
  decidedAt?: Date | null;
  refundedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

class ReturnRequest extends Model<ReturnRequestAttributes> implements ReturnRequestAttributes {
  public id!: string;
  public orderId!: string;
  public orderItemId?: string | null;
  public productId!: string;
  public storeId!: string;
  public customerId!: string;
  public sellerId!: string;
  public reason!: ReturnReason;
  public customerNote?: string | null;
  public quantity!: number;
  public refundAmount?: number | null;
  public status!: ReturnStatus;
  public sellerNote?: string | null;
  public returnAddress?: string | null;
  public trackingNumber?: string | null;
  public decidedAt?: Date | null;
  public refundedAt?: Date | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ReturnRequest.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'orders', key: 'id' }
    },
    orderItemId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'NULL = tüm sipariş iadesi'
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    storeId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'stores', key: 'id' }
    },
    customerId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' }
    },
    sellerId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    reason: {
      type: DataTypes.ENUM('withdrawal', 'defective', 'wrong', 'incomplete', 'other'),
      allowNull: false,
      defaultValue: 'withdrawal'
    },
    customerNote: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    refundAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      comment: 'İade edilen tutar (onay sonrası netleşir)'
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected', 'shipped', 'inspected', 'refunded', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending'
    },
    sellerNote: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    returnAddress: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Satıcının onayda ilettiği iade adresi'
    },
    trackingNumber: {
      type: DataTypes.STRING(120),
      allowNull: true,
      comment: 'Müşterinin ürünü gönderirken girdiği takip no'
    },
    decidedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    refundedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  },
  {
    sequelize,
    tableName: 'return_requests',
    timestamps: true,
    indexes: [
      { name: 'idx_returns_order', fields: ['orderId', 'status'] },
      { name: 'idx_returns_store', fields: ['storeId', 'status', 'createdAt'] },
      { name: 'idx_returns_customer', fields: ['customerId', 'createdAt'] }
    ]
  }
);

export default ReturnRequest;
