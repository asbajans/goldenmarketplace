
import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';

export class MarketplaceIntegration extends Model {
    public id!: string;
    public userId!: string;
    public platform!: 'etsy' | 'amazon' | 'trendyol' | 'hepsiburada' | 'n11' | 'pazarama';
    public apiKey!: string;
    public apiSecret!: string;
    public accessToken?: string;
    public refreshToken?: string;
    public shopId?: string;
    public isActive!: boolean;
    public lastSyncStatus?: 'success' | 'error';
    public lastSyncMessage?: string;
    public lastSyncAt?: Date;
    // Etsy product creation config
    public etsyCategoryId?: number;
    // Trendyol product creation config
    public trendyolCategoryId?: number;
    public trendyolBrandId?: number;
    // N11 product creation config
    public n11CategoryId?: string;
    // Pazarama product creation config
    public pazaramaCategoryId?: string;
    public pazaramaBrandId?: string;
    // Default VAT rate for product creation (10 or 20)
    public defaultVatRate?: number;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

MarketplaceIntegration.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        platform: {
            type: DataTypes.ENUM('etsy', 'amazon', 'trendyol', 'hepsiburada', 'n11', 'pazarama'),
            allowNull: false
        },
        apiKey: {
            type: DataTypes.STRING,
            allowNull: true // Some platforms might use different auth
        },
        apiSecret: {
            type: DataTypes.STRING,
            allowNull: true
        },
        accessToken: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        refreshToken: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        shopId: {
            type: DataTypes.STRING,
            allowNull: true
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        lastSyncStatus: {
            type: DataTypes.ENUM('success', 'error'),
            allowNull: true
        },
        lastSyncMessage: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        lastSyncAt: {
            type: DataTypes.DATE,
            allowNull: true
        },
        etsyCategoryId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'Etsy taxonomy/category ID required for product creation'
        },
        trendyolCategoryId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'Trendyol category ID required for product creation'
        },
        trendyolBrandId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'Trendyol brand ID required for product creation'
        },
        n11CategoryId: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: 'N11 category ID for product creation'
        },
        pazaramaCategoryId: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: 'Pazarama category ID for product creation'
        },
        pazaramaBrandId: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: 'Pazarama brand ID for product creation'
        },
        defaultVatRate: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 10,
            comment: 'KDV rate for product creation (10 or 20)'
        }
    },
    {
        sequelize,
        tableName: 'marketplace_integrations',
        indexes: [
            {
                unique: true,
                fields: ['userId', 'platform'] // One connection per platform per user
            }
        ]
    }
);

export default MarketplaceIntegration;
