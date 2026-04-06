import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

interface VariationOptionAttributes {
  id?: string;
  variationId: string;
  value: string;
  orderIndex: number;
  createdAt?: Date;
  updatedAt?: Date;
}

class VariationOption extends Model<VariationOptionAttributes> implements VariationOptionAttributes {
  public id!: string;
  public variationId!: string;
  public value!: string;
  public orderIndex!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

VariationOption.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    variationId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'variations',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    value: {
      type: DataTypes.STRING,
      allowNull: false
    },
    orderIndex: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  },
  {
    sequelize,
    tableName: 'variation_options',
    timestamps: true,
    indexes: [
      { fields: ['variationId'] }
    ]
  }
);

export default VariationOption;
