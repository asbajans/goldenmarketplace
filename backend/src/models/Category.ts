/**
 * Category Model
 * Schema for product categories
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

interface CategoryAttributes {
    id?: string;
    name: string;
    slug: string;
    description?: string;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

class Category extends Model<CategoryAttributes> implements CategoryAttributes {
    public id!: string;
    public name!: string;
    public slug!: string;
    public description?: string;
    public isActive!: boolean;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Category.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        slug: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    },
    {
        sequelize,
        tableName: 'categories',
        timestamps: true
    }
);

export default Category;
