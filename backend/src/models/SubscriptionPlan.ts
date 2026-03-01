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
    price: number;
    currency: string;
    interval: string;
    stripePriceId?: string;
    productLimit: number; // max products a seller can have
    features: string[];
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

class SubscriptionPlan extends Model<SubscriptionPlanAttributes> implements SubscriptionPlanAttributes {
    public id!: string;
    public name!: string;
    public description?: string;
    public price!: number;
    public currency!: string;
    public interval!: string;
    public stripePriceId?: string;
    public productLimit!: number;
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
        price: { // Renamed from priceTRY to price to match interface
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0
        },
        currency: { // Added to match interface
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'TRY'
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
