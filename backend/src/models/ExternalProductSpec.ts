/**
 * ExternalProductSpec Model
 * Tedarikçi detay sayfalarından TEK SEFERLİK scrape ile toplanan
 * teknik özellikler (XML feed'de olmayan: ALTIN GRAMI, ALTIN AYARI...).
 * Feed senkronu bu tabloya DOKUNMAZ; eşleştirme ayrı adımla ürüne işlenir.
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

interface ExternalProductSpecAttributes {
  id?: string;
  feedId: string;
  sku: string;
  sourceUrl?: string | null;
  specs?: any;
  verified?: boolean;
  fetchedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

class ExternalProductSpec extends Model<ExternalProductSpecAttributes> implements ExternalProductSpecAttributes {
  public id!: string;
  public feedId!: string;
  public sku!: string;
  public sourceUrl?: string | null;
  public specs?: any;
  public verified!: boolean;
  public fetchedAt?: Date | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ExternalProductSpec.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    feedId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'external_feeds', key: 'id' }
    },
    sku: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Normalize SKU (bosluksuz, buyuk harf) — eslestirme anahtari'
    },
    sourceUrl: {
      type: DataTypes.STRING(2000),
      allowNull: true
    },
    specs: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      comment: 'Detay sayfasindaki özellik tablosu: { "ALTIN GRAMI": "...", "ALTIN AYARI": "14 AYAR", ... }'
    },
    verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'ÜRÜN KODU sayfadakiyle eslesti mi (yanlis urune veri yazilmamasi icin sart)'
    },
    fetchedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  },
  {
    sequelize,
    tableName: 'external_product_specs',
    timestamps: true,
    indexes: [
      { name: 'idx_specs_feed_sku', unique: true, fields: ['feedId', 'sku'] },
      { name: 'idx_specs_feed', fields: ['feedId'] }
    ]
  }
);

export default ExternalProductSpec;
