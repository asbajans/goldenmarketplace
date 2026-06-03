import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

interface ProductAITaskAttributes {
  id?: string;
  productId: string;
  userId: string;
  taskType: 'translate' | 'generate_content' | 'both';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  creditsConsumed?: number;
  result?: any;
  error?: string;
  createdAt?: Date;
  updatedAt?: Date;
  completedAt?: Date;
}

class ProductAITask extends Model<ProductAITaskAttributes> implements ProductAITaskAttributes {
  public id!: string;
  public productId!: string;
  public userId!: string;
  public taskType!: 'translate' | 'generate_content' | 'both';
  public status!: 'pending' | 'processing' | 'completed' | 'failed';
  public progress!: number;
  public creditsConsumed!: number;
  public result?: any;
  public error?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public completedAt?: Date;
}

ProductAITask.init(
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
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' }
    },
    taskType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'both'
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'pending'
    },
    progress: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    creditsConsumed: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    result: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    error: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  },
  {
    sequelize,
    tableName: 'product_ai_tasks',
    timestamps: true
  }
);

export default ProductAITask;
