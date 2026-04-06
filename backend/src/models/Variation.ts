import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

interface VariationAttributes {
  id?: string;
  userId: string;
  name: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

class Variation extends Model<VariationAttributes> implements VariationAttributes {
  public id!: string;
  public userId!: string;
  public name!: string;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Variation.init(
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
      },
      onDelete: 'CASCADE'
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  },
  {
    sequelize,
    tableName: 'variations',
    timestamps: true,
    indexes: [
      { fields: ['userId'] }
    ]
  }
);

export default Variation;
