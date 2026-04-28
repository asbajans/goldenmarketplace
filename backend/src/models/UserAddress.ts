/**
 * UserAddress Model
 * Customer saved shipping/billing addresses
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

interface UserAddressAttributes {
  id?: string;
  userId: string;
  name: string;       // Address label e.g. "Home", "Work"
  fullName: string;   // Recipient name
  address: string;    // Street address
  city: string;
  district?: string;
  postalCode?: string;
  country: string;
  phone: string;
  isDefault: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

class UserAddress extends Model<UserAddressAttributes> implements UserAddressAttributes {
  public id!: string;
  public userId!: string;
  public name!: string;
  public fullName!: string;
  public address!: string;
  public city!: string;
  public district?: string;
  public postalCode?: string;
  public country!: string;
  public phone!: string;
  public isDefault!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

UserAddress.init(
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
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Address label e.g. Home, Work'
    },
    fullName: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Recipient full name'
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    city: {
      type: DataTypes.STRING,
      allowNull: false
    },
    district: {
      type: DataTypes.STRING,
      allowNull: true
    },
    postalCode: {
      type: DataTypes.STRING,
      allowNull: true
    },
    country: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'Turkey'
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  },
  {
    sequelize,
    tableName: 'user_addresses',
    timestamps: true,
    indexes: [
      { name: 'idx_user_addresses_user', fields: ['userId'] }
    ]
  }
);

export default UserAddress;
