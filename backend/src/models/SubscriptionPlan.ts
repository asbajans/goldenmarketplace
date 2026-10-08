/**
 * SubscriptionPlan Model
 * Schema for subscription plans (limits, prices, features)
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

interface SubscriptionPlanAttributes {
    id?: string;
    name: string;
    description?: string;
    monthlyPrice: number;
    yearlyPrice: number;
    currency: string;
    interval: string;
    productLimit: number; // max products a seller can have
    integrationLimit: number; // max marketplaces a seller can connect
    aiTranslationEnabled?: boolean;
    aiContentEnabled?: boolean;
    aiMonthlyCredit?: number;
    b2bEnabled?: boolean; // B2B pazara erişim + ürün kopyalama
    bulkUploadEnabled?: boolean; // Excel/CSV toplu ürün yükleme
    maxExternalFeeds?: number; // harici feed (XML/CSV) adedi, 0 = kapalı
    stripePriceId?: string;
    stripePriceIdYearly?: string; // yıllık dönem için ayrı Stripe Price ID
    features: string[];
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

class SubscriptionPlan extends Model<SubscriptionPlanAttributes> implements SubscriptionPlanAttributes {
    public id!: string;
    public name!: string;
    public description?: string;
    public monthlyPrice!: number;
    public yearlyPrice!: number;
    public currency!: string;
    public interval!: string;
    public stripePriceId?: string;
    public productLimit!: number;
    public integrationLimit!: number;
    public aiTranslationEnabled?: boolean;
    public aiContentEnabled?: boolean;
    public aiMonthlyCredit?: number;
    public b2bEnabled?: boolean;
    public bulkUploadEnabled?: boolean;
    public maxExternalFeeds?: number;
    public stripePriceIdYearly?: string;
    public features!: string[];
    public isActive!: boolean;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

SubscriptionPlan.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        monthlyPrice: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0
        },
        yearlyPrice: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0
        },
        currency: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'USD'
        },
        interval: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'month'
        },
        stripePriceId: {
            type: DataTypes.STRING,
            allowNull: true
        },
        productLimit: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 50
        },
        integrationLimit: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1
        },
        aiTranslationEnabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        aiContentEnabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        aiMonthlyCredit: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        b2bEnabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'B2B pazara erişim + tedarikçi ürün kopyalama'
        },
        bulkUploadEnabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'Excel/CSV ile toplu ürün yükleme'
        },
        maxExternalFeeds: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            comment: 'Harici feed (XML/CSV içe aktarma) adedi, 0 = kapalı'
        },
        stripePriceIdYearly: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: 'Yıllık dönem için Stripe Price ID'
        },
        features: {
            type: DataTypes.JSON,
            allowNull: true,
            defaultValue: []
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    },
    {
        sequelize,
        tableName: 'subscription_plans',
        timestamps: true
    }
);

export default SubscriptionPlan;
