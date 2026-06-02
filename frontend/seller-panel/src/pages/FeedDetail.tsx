import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Descriptions, Tag, Button, message, Spin, Space, Typography, Table, Divider,
  Statistic, Row, Col, Alert, Tooltip
} from 'antd';
import {
  ArrowLeftOutlined, SyncOutlined, CheckCircleOutlined,
  CloseCircleOutlined, ClockCircleOutlined, LinkOutlined
} from '@ant-design/icons';
import { getFeed, syncFeed, getFeedLogs, ExternalFeed, FeedSyncLog } from '../api/externalFeeds';

const { Title, Text } = Typography;

const FeedDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [feed, setFeed] = useState<ExternalFeed | null>(null);
  const [logs, setLogs] = useState<FeedSyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (id) {
      Promise.all([loadFeed(id), loadLogs(id)]).finally(() => setLoading(false));
    }
  }, [id]);

  const loadFeed = async (feedId: string) => {
    try {
      const data = await getFeed(feedId);
      setFeed(data);
    } catch {
      message.error('Feed bilgisi alınamadı');
    }
  };

  const loadLogs = async (feedId: string) => {
    try {
      const data = await getFeedLogs(feedId);
      setLogs(data || []);
    } catch {
      // silent
    }
  };

  const handleSync = async () => {
    if (!id) return;
    setSyncing(true);
    try {
      const result = await syncFeed(id);
      message.success(result.message);
      setTimeout(() => {
        loadFeed(id);
        loadLogs(id);
      }, 2000);
    } catch {
      message.error('Senkronizasyon başlatılamadı');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;
  }

  if (!feed) {
    return <Alert type="error" message="Feed bulunamadı" showIcon />;
  }

  const lastResult = feed.lastSyncResult;

  const logColumns = [
    {
      title: 'Başlangıç',
      dataIndex: 'startedAt',
      key: 'startedAt',
      render: (d: string) => new Date(d).toLocaleString('tr-TR')
    },
    {
      title: 'Bitiş',
      dataIndex: 'completedAt',
      key: 'completedAt',
      render: (d: string) => d ? new Date(d).toLocaleString('tr-TR') : '—'
    },
    {
      title: 'Durum',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => {
        const config: Record<string, { color: string; icon: any }> = {
          running: { color: 'processing', icon: <SyncOutlined spin /> },
          success: { color: 'success', icon: <CheckCircleOutlined /> },
          failed: { color: 'error', icon: <CloseCircleOutlined /> }
        };
        const c = config[s] || { color: 'default', icon: null };
        return <Tag color={c.color} icon={c.icon}>{s === 'running' ? 'Çalışıyor' : s === 'success' ? 'Başarılı' : 'Hata'}</Tag>;
      }
    },
    {
      title: 'Eklenen',
      key: 'added',
      render: (_: any, r: FeedSyncLog) => r.summary?.added || 0,
      width: 80
    },
    {
      title: 'Güncellenen',
      key: 'updated',
      render: (_: any, r: FeedSyncLog) => r.summary?.updated || 0,
      width: 100
    },
    {
      title: 'Hatalı',
      key: 'failed',
      render: (_: any, r: FeedSyncLog) => r.summary?.failed ?
        <Tag color="red">{r.summary.failed}</Tag> : 0,
      width: 80
    },
    {
      title: 'Hata Mesajları',
      key: 'errors',
      render: (_: any, r: FeedSyncLog) => (
        <Text type="secondary" style={{ fontSize: 11 }}>
          {r.summary?.errors?.slice(0, 2).join('; ') || '—'}
        </Text>
      )
    }
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/feeds')}>Feed Listesi</Button>
      </Space>

      <Row gutter={[16, 16]}>
        <Col span={16}>
          <Card title={
            <Space><LinkOutlined style={{ color: '#d4a017' }} />{feed.name}</Space>
          }>
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="URL" span={2}>{feed.feedUrl}</Descriptions.Item>
              <Descriptions.Item label="Format"><Tag>{feed.fileFormat?.toUpperCase()}</Tag></Descriptions.Item>
              <Descriptions.Item label="Auth">{feed.authType}</Descriptions.Item>
              <Descriptions.Item label="Fiyat Modu">
                <Tag color={feed.pricingMode === 'fixed' ? 'blue' : 'gold'}>
                  {feed.pricingMode === 'fixed' ? 'Sabit Fiyat' : 'Altın Formülü'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Para Birimi">{feed.currency === 'TRY' ? 'TL' : 'USD'}</Descriptions.Item>
              <Descriptions.Item label="Fiyat Çarpanı">{feed.priceMultiplier}</Descriptions.Item>
              <Descriptions.Item label="Otomatik Sync">
                <Tag color={feed.autoSync ? 'green' : 'default'}>{feed.autoSync ? 'Açık' : 'Kapalı'}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Aralık">{feed.updateInterval}</Descriptions.Item>
              <Descriptions.Item label="Son Sync">
                {feed.lastSyncAt ? new Date(feed.lastSyncAt).toLocaleString('tr-TR') : 'Henüz yapılmadı'}
              </Descriptions.Item>
              <Descriptions.Item label="Durum">
                <Tag color={feed.isActive ? 'success' : 'error'}>{feed.isActive ? 'Aktif' : 'Pasif'}</Tag>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col span={8}>
          <Card>
            <Statistic
              title="Toplam Ürün"
              value={lastResult ? (lastResult.added || 0) + (lastResult.updated || 0) : '—'}
              suffix={lastResult ? `(son sync)` : ''}
            />
            <Divider />
            <Space direction="vertical" style={{ width: '100%' }}>
              <Statistic title="Eklenen" value={lastResult?.added || 0} suffix="ürün"
                valueStyle={{ color: '#52c41a' }} />
              <Statistic title="Güncellenen" value={lastResult?.updated || 0} suffix="ürün"
                valueStyle={{ color: '#1677ff' }} />
              {lastResult?.failed > 0 && (
                <Statistic title="Hatalı" value={lastResult.failed} suffix="ürün"
                  valueStyle={{ color: '#ff4d4f' }} />
              )}
            </Space>
          </Card>
          <div style={{ marginTop: 16 }}>
            <Button
              type="primary"
              icon={<SyncOutlined spin={syncing} />}
              onClick={handleSync}
              loading={syncing}
              block
              size="large"
              disabled={!feed.isActive}
              style={{ background: '#d4a017', borderColor: '#d4a017' }}
            >
              {syncing ? 'Senkronize Ediliyor...' : 'Şimdi Senkronize Et'}
            </Button>
          </div>
        </Col>
      </Row>

      <Card title="Senkronizasyon Geçmişi" style={{ marginTop: 16 }}>
        <Table
          dataSource={logs}
          columns={logColumns}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          size="small"
        />
      </Card>
    </div>
  );
};

export default FeedDetail;
