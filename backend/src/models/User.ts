/**
 * User Model
 * Schema for sellers, customers, and admins
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

interface UserAttributes {
  id?: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  userType: 'seller' | 'customer' | 'admin';
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

class User extends Model<UserAttributes> implements UserAttributes {
  public id!: string;
  public email!: string;
  public password!: string;
  public firstName!: string;
  public lastName!: string;
  public phone?: string;
  public userType!: 'seller' | 'customer' | 'admin';
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { isEmail: true }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true
    },
    userType: {
      type: DataTypes.ENUM('seller', 'customer', 'admin'),
      allowNull: false,
      defaultValue: 'customer'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  },
  {
    sequelize,
    tableName: 'users',
    timestamps: true
  }
);

export default User;
