/**
 * GlobalSetting Model
 * Holds site-wide configurations such as marketplace API keys.
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

interface GlobalSettingAttributes {
    key: string;
    value: string;
    description?: string;
    isPublic: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export class GlobalSetting extends Model<GlobalSettingAttributes> implements GlobalSettingAttributes {
    public key!: string;
    public value!: string;
    public description?: string;
    public isPublic!: boolean;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

GlobalSetting.init(
    {
        key: {
            type: DataTypes.STRING,
            primaryKey: true,
            allowNull: false
        },
        value: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        description: {
            type: DataTypes.STRING,
            allowNull: true
        },
        isPublic: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        }
    },
    {
        sequelize,
        tableName: 'global_settings',
        timestamps: true
    }
);

export default GlobalSetting;
