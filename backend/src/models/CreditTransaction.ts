/**
 * CreditTransaction Model
 * Satın alınan / admin tarafından tanımlanan AI kredilerinin denetim kaydı.
 * Aylık paket kotası buraya yazılmaz (o hakediştir, bakiye değildir);
 * sadece bakiyeyi değiştiren hareketler loglanır.
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

export type CreditTransactionType = 'purchase' | 'admin_grant';

interface CreditTransactionAttributes {
  id?: string;
  userId: string;
  amount: number;
  type: CreditTransactionType;
  reason?: string | null;
  balanceAfter?: number | null;
  refId?: string | null;
  createdBy?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

class CreditTransaction extends Model<CreditTransactionAttributes> implements CreditTransactionAttributes {
  public id!: string;
  public userId!: string;
  public amount!: number;
  public type!: CreditTransactionType;
  public reason?: string | null;
  public balanceAfter?: number | null;
  public refId?: string | null;
  public createdBy?: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

CreditTransaction.init(
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
    amount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Eklenen kredi adedi (pozitif)'
    },
    type: {
      type: DataTypes.ENUM('purchase', 'admin_grant'),
      allowNull: false
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    balanceAfter: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    refId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'İlişkili Payment.id (satın alımlarda)'
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'İşlemi yapan admin kullanıcı id (admin_grant)'
    }
  },
  {
    sequelize,
    tableName: 'credit_transactions',
    timestamps: true,
    indexes: [
      { name: 'idx_credit_tx_user', fields: ['userId', 'createdAt'] }
    ]
  }
);

export default CreditTransaction;
