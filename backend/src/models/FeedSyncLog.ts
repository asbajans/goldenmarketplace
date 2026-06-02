import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

interface FeedSyncLogAttributes {
  id?: string;
  feedId: string;
  storeId: string;
  status: 'running' | 'success' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  summary?: any;
  createdAt?: Date;
}

class FeedSyncLog extends Model<FeedSyncLogAttributes> implements FeedSyncLogAttributes {
  public id!: string;
  public feedId!: string;
  public storeId!: string;
  public status!: 'running' | 'success' | 'failed';
  public startedAt!: Date;
  public completedAt?: Date;
  public summary?: any;
  public readonly createdAt!: Date;
}

FeedSyncLog.init(
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
    storeId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'stores', key: 'id' }
    },
    status: {
      type: DataTypes.ENUM('running', 'success', 'failed'),
      allowNull: false,
      defaultValue: 'running'
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    summary: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  },
  {
    sequelize,
    tableName: 'feed_sync_logs',
    timestamps: true,
    updatedAt: false,
    indexes: [
      { name: 'idx_feed_sync_logs_feed', fields: ['feedId'] },
      { name: 'idx_feed_sync_logs_store', fields: ['storeId'] }
    ]
  }
);

export default FeedSyncLog;
