/**
 * Gemstone Model
 * Taş kataloğu: storeId NULL = admin yönetiminde GLOBAL (altın fiyatı gibi),
 * dolu = satıcıya özel. Ürünler her ikisini de kullanabilir.
 * Fiyat: karat × USD karat fiyatı × kesim çarpanı × özellik çarpanı → USD,
 * TRY karşılığı güncel kurla hesaplanır.
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

interface GemstoneAttributes {
  id?: string;
  storeId?: string | null;
  name: string;
  translations?: any;
  pricePerCaratUSD?: number;
  cutMultipliers?: any;
  qualityMultipliers?: any;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

class Gemstone extends Model<GemstoneAttributes> implements GemstoneAttributes {
  public id!: string;
  public storeId?: string | null;
  public name!: string;
  public translations?: any;
  public pricePerCaratUSD!: number;
  public cutMultipliers?: any;
  public qualityMultipliers?: any;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Gemstone.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    storeId: {
      type: DataTypes.UUID,
      allowNull: true,
      defaultValue: null,
      references: { model: 'stores', key: 'id' },
      comment: 'NULL = admin global kataloğu, dolu = satıcıya özel'
    },
    name: {
      type: DataTypes.STRING(120),
      allowNull: false
    },
    translations: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      comment: 'Taş adı çevirileri: { en: { name }, tr: {...}, ... }'
    },
    pricePerCaratUSD: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Karat başına baz fiyat (USD). 0 = teşhir, toplama eklenmez.'
    },
    cutMultipliers: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      comment: 'Kesim çarpanları, örn. {"baget": 1.2, "markiz": 1.15}'
    },
    qualityMultipliers: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      comment: 'Özellik çarpanları, örn. {"fg/si": 1.1, "vs": 1.25}'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  },
  {
    sequelize,
    tableName: 'gemstones',
    timestamps: true,
    indexes: [
      { name: 'idx_gemstones_store', fields: ['storeId', 'isActive'] }
    ]
  }
);

export default Gemstone;
