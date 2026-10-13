/**
 * ProductStone Model
 * Üründeki taş seçenekleri (müşteri seçim yapar, toplam fiyata yansır).
 * Fiyat saklanmaz — katalogdaki güncel karat fiyatından her okumada hesaplanır.
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

interface ProductStoneAttributes {
  id?: string;
  productId: string;
  gemstoneId: string;
  carat?: number | null;
  cut?: string | null;
  quality?: string | null;
  quantity?: number;
  isFixed?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

class ProductStone extends Model<ProductStoneAttributes> implements ProductStoneAttributes {
  public id!: string;
  public productId!: string;
  public gemstoneId!: string;
  public carat?: number | null;
  public cut?: string | null;
  public quality?: string | null;
  public quantity!: number;
  public isFixed!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ProductStone.init(
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
    gemstoneId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'gemstones', key: 'id' }
    },
    carat: {
      type: DataTypes.DECIMAL(10, 4),
      allowNull: true,
      comment: 'Toplam karat (bu üründeki taşlar için)'
    },
    cut: {
      type: DataTypes.STRING(60),
      allowNull: true,
      comment: 'Kesim (baget, markiz, oval, prenses, yuvarlak...)'
    },
    quality: {
      type: DataTypes.STRING(120),
      allowNull: true,
      comment: 'Özellik (renk/berraklık, örn. FG/SI)'
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Taş adedi'
    },
    isFixed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Sabit taş: seçim yapılamaz, bilgi olarak gösterilir, toplama eklenmez'
    }
  },
  {
    sequelize,
    tableName: 'product_stones',
    timestamps: true,
    indexes: [
      { name: 'idx_product_stones_product', fields: ['productId'] },
      { name: 'idx_product_stones_gem', fields: ['gemstoneId'] }
    ]
  }
);

export default ProductStone;
