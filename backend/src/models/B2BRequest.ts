/**
 * B2BRequest Model
 * Tracks requests from sellers who want to list another seller's B2B product in their own store.
 * Status flow: pending → approved | rejected
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

export type B2BRequestStatus = 'pending' | 'approved' | 'rejected';

interface B2BRequestAttributes {
  id?: string;
  productId: string;
  variantId?: string;
  requesterStoreId: string;
  ownerStoreId: string;
  status: B2BRequestStatus;
  requestNote?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

class B2BRequest extends Model<B2BRequestAttributes> implements B2BRequestAttributes {
  public id!: string;
  public productId!: string;
  public variantId?: string;
  public requesterStoreId!: string;
  public ownerStoreId!: string;
  public status!: B2BRequestStatus;
  public requestNote?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

B2BRequest.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'products', key: 'id' }
    },
    variantId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'product_variants', key: 'id' }
    },
    requesterStoreId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'stores', key: 'id' }
    },
    ownerStoreId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'stores', key: 'id' }
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      allowNull: false,
      defaultValue: 'pending'
    },
    requestNote: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  },
  {
    sequelize,
    tableName: 'b2b_requests',
    timestamps: true,
    indexes: [
      { fields: ['productId'] },
      { fields: ['variantId'] },
      { fields: ['requesterStoreId'] },
      { fields: ['ownerStoreId'] },
      { unique: true, fields: ['productId', 'variantId', 'requesterStoreId'], name: 'unique_b2b_request' }
    ]
  }
);

export default B2BRequest;
