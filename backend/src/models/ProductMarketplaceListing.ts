/**
 * ProductMarketplaceListing
 *
 * Tracks whether a product has been listed on a marketplace platform,
 * and stores the external product ID/code returned by the marketplace.
 *
 * Logic:
 *  - No record → product NOT yet listed on that platform → CREATE
 *  - Record exists (status=active/pending) → product already listed → UPDATE price/stock
 *  - Record exists (status=failed) → retry CREATE
 */

import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';

export class ProductMarketplaceListing extends Model {
    public id!: string;
    public productId!: string;
    public platform!: 'trendyol' | 'n11' | 'hepsiburada' | 'pazarama' | 'etsy' | 'amazon';
    public externalId?: string;      // Marketplace-assigned product ID
    public externalCode!: string;    // Barcode / stock code used for updates
    public batchRequestId?: string;  // Trendyol batch request ID
    public status!: 'pending' | 'active' | 'failed';
    public lastError?: string;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

ProductMarketplaceListing.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        productId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        platform: {
            type: DataTypes.ENUM('trendyol', 'n11', 'hepsiburada', 'pazarama', 'etsy', 'amazon'),
            allowNull: false
        },
        externalId: {
            type: DataTypes.STRING,
            allowNull: true
        },
        externalCode: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: 'Barcode or seller stock code used for price/stock updates'
        },
        batchRequestId: {
            type: DataTypes.STRING,
            allowNull: true
        },
        status: {
            type: DataTypes.ENUM('pending', 'active', 'failed'),
            defaultValue: 'pending'
        },
        lastError: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    },
    {
        sequelize,
        tableName: 'product_marketplace_listings',
        indexes: [
            {
                unique: true,
                fields: ['productId', 'platform']
            }
        ]
    }
);

export default ProductMarketplaceListing;
