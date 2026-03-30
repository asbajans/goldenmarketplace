import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

interface ProductVariantAttributes {
  id?: string;
  productId: string;
  sku: string;
  attributes: any;
  gramWeight: number;
  quantity: number;
  priceTRY: number;
  priceUSD: number;
  b2bPrice: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

class ProductVariant extends Model<ProductVariantAttributes> implements ProductVariantAttributes {
  public id!: string;
  public productId!: string;
  public sku!: string;
  public attributes!: any;
  public gramWeight!: number;
  public quantity!: number;
  public priceTRY!: number;
  public priceUSD!: number;
  public b2bPrice!: number;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ProductVariant.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'products',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    sku: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    attributes: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {}
    },
    gramWeight: {
      type: DataTypes.DECIMAL(15, 4),
      allowNull: false,
      comment: 'Variant specific weight in grams'
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    priceTRY: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0
    },
    priceUSD: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0
    },
    b2bPrice: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  },
  {
    sequelize,
    tableName: 'ProductVariants',
    timestamps: true,
    indexes: [
      { fields: ['productId'] },
      { fields: ['sku'] }
    ]
  }
);

export default ProductVariant;
