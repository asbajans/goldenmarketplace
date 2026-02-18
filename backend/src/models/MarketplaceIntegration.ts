
import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';

export class MarketplaceIntegration extends Model {
    public id!: string;
    public userId!: string;
    public platform!: 'etsy' | 'amazon' | 'trendyol' | 'hepsiburada' | 'n11';
    public apiKey!: string;
    public apiSecret!: string;
    public accessToken?: string;
    public refreshToken?: string;
    public shopId?: string; // Platform specific shop ID
    public isActive!: boolean;
    public lastSyncAt?: Date;

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
            type: DataTypes.ENUM('etsy', 'amazon', 'trendyol', 'hepsiburada', 'n11'),
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
        lastSyncAt: {
            type: DataTypes.DATE,
            allowNull: true
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
