import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

interface IntegrationLogAttributes {
  id?: string;
  userId?: string;
  platform: string;
  endpoint: string;
  requestMethod: string;
  requestPayload?: any;
  responseStatus?: number;
  responsePayload?: any;
  isSuccess: boolean;
  errorMessage?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

class IntegrationLog extends Model<IntegrationLogAttributes> implements IntegrationLogAttributes {
  public id!: string;
  public userId?: string;
  public platform!: string;
  public endpoint!: string;
  public requestMethod!: string;
  public requestPayload?: any;
  public responseStatus?: number;
  public responsePayload?: any;
  public isSuccess!: boolean;
  public errorMessage?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

IntegrationLog.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    platform: {
      type: DataTypes.STRING,
      allowNull: false
    },
    endpoint: {
      type: DataTypes.STRING,
      allowNull: false
    },
    requestMethod: {
      type: DataTypes.STRING,
      allowNull: false
    },
    requestPayload: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    responseStatus: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    responsePayload: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    isSuccess: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  },
  {
    sequelize,
    tableName: 'IntegrationLogs',
    timestamps: true,
    indexes: [
      { fields: ['userId'] },
      { fields: ['platform'] },
      { fields: ['isSuccess'] },
      { fields: ['createdAt'] }
    ]
  }
);

export default IntegrationLog;
