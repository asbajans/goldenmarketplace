import React, { useState, useEffect } from 'react';
import {
  Tabs, Table, Tag, Button, message, Typography, Space,
  Empty, Spin, Popconfirm, Avatar, Tooltip
} from 'antd';
import {
  CheckOutlined, CloseOutlined, ShopOutlined, GoldOutlined
} from '@ant-design/icons';
import {
  getIncomingRequests, getOutgoingRequests,
  approveB2BRequest, rejectB2BRequest,
  type B2BRequest
} from '../api/b2b';

const { Title, Text } = Typography;

const statusTag = (status: string) => {
  const map: Record<string, { color: string; label: string }> = {
    pending: { color: 'orange', label: 'Beklemede' },
    approved: { color: 'green', label: 'Onaylandı' },
    rejected: { color: 'red', label: 'Reddedildi' }
  };
  const s = map[status] || { color: 'default', label: status };
  return <Tag color={s.color}>{s.label}</Tag>;
};

const B2BRequests: React.FC = () => {
  const [incoming, setIncoming] = useState<B2BRequest[]>([]);
  const [outgoing, setOutgoing] = useState<B2BRequest[]>([]);
  const [loadingIncoming, setLoadingIncoming] = useState(true);
  const [loadingOutgoing, setLoadingOutgoing] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchIncoming();
    fetchOutgoing();
  }, []);

  const fetchIncoming = async () => {
    try {
      const { data } = await getIncomingRequests();
      setIncoming(data);
    } catch {
      message.error('Gelen talepler yüklenemedi');
    } finally {
      setLoadingIncoming(false);
    }
  };

  const fetchOutgoing = async () => {
    try {
      const { data } = await getOutgoingRequests();
      setOutgoing(data);
    } catch {
      message.error('Gönderilen talepler yüklenemedi');
    } finally {
      setLoadingOutgoing(false);
    }
  };

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      await approveB2BRequest(id);
      message.success('Talep onaylandı!');
      fetchIncoming();
    } catch (err: any) {
      message.error(err?.response?.data?.error || 'Onay başarısız');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoading(id);
    try {
      await rejectB2BRequest(id);
      message.warning('Talep reddedildi.');
      fetchIncoming();
    } catch (err: any) {
      message.error(err?.response?.data?.error || 'Ret başarısız');
    } finally {
      setActionLoading(null);
    }
  };

  const incomingColumns = [
    {
      title: 'Ürün',
      key: 'product',
      render: (_: any, record: B2BRequest) => (
        <Space>
          {record.product?.images?.[0] ? (
            <Avatar src={record.product.images[0]} shape="square" size={40} />
          ) : (
            <Avatar icon={<GoldOutlined />} shape="square" size={40} style={{ background: '#d4a017' }} />
          )}
          <div>
            <Text strong style={{ fontSize: 13 }}>{record.product?.title}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 11 }}>{record.product?.category}</Text>
          </div>
        </Space>
      )
    },
    {
      title: 'Talep Eden Mağaza',
      key: 'requesterStore',
      render: (_: any, record: B2BRequest) => (
        <Space>
          <Avatar icon={<ShopOutlined />} size="small" style={{ background: '#1890ff' }} />
          <Text>{record.requesterStore?.name || '—'}</Text>
        </Space>
      )
    },
    {
      title: 'B2B Fiyatı',
      key: 'b2bPrice',
      render: (_: any, record: B2BRequest) => (
        <Text strong style={{ color: '#389e0d' }}>
          {record.product?.b2bPrice
            ? `${Number(record.product.b2bPrice).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`
            : '—'}
        </Text>
      )
    },
    {
      title: 'Durum',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => statusTag(s)
    },
    {
      title: 'Tarih',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (d: string) => new Date(d).toLocaleDateString('tr-TR')
    },
    {
      title: 'İşlem',
      key: 'action',
      render: (_: any, record: B2BRequest) =>
        record.status === 'pending' ? (
          <Space>
            <Tooltip title="Onayla">
              <Popconfirm
                title="Bu talebi onaylamak istediğinize emin misiniz?"
                onConfirm={() => handleApprove(record.id)}
                okText="Evet, Onayla"
                cancelText="İptal"
                okButtonProps={{ style: { background: '#52c41a', borderColor: '#52c41a' } }}
              >
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  size="small"
                  loading={actionLoading === record.id}
                  style={{ background: '#52c41a', borderColor: '#52c41a' }}
                >
                  Onayla
                </Button>
              </Popconfirm>
            </Tooltip>
            <Tooltip title="Reddet">
              <Popconfirm
                title="Bu talebi reddetmek istediğinize emin misiniz?"
                onConfirm={() => handleReject(record.id)}
                okText="Evet, Reddet"
                cancelText="İptal"
                okButtonProps={{ danger: true }}
              >
                <Button
                  danger
                  icon={<CloseOutlined />}
                  size="small"
                  loading={actionLoading === record.id}
                >
                  Reddet
                </Button>
              </Popconfirm>
            </Tooltip>
          </Space>
        ) : (
          <Text type="secondary" style={{ fontSize: 12 }}>İşlem yok</Text>
        )
    }
  ];

  const outgoingColumns = [
    {
      title: 'Ürün',
      key: 'product',
      render: (_: any, record: B2BRequest) => (
        <Space>
          {record.product?.images?.[0] ? (
            <Avatar src={record.product.images[0]} shape="square" size={40} />
          ) : (
            <Avatar icon={<GoldOutlined />} shape="square" size={40} style={{ background: '#d4a017' }} />
          )}
          <div>
            <Text strong style={{ fontSize: 13 }}>{record.product?.title}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 11 }}>{record.product?.category}</Text>
          </div>
        </Space>
      )
    },
    {
      title: 'Stok Sahibi Mağaza',
      key: 'ownerStore',
      render: (_: any, record: B2BRequest) => (
        <Space>
          <Avatar icon={<ShopOutlined />} size="small" style={{ background: '#722ed1' }} />
          <Text>{record.ownerStore?.name || '—'}</Text>
        </Space>
      )
    },
    {
      title: 'Satış Fiyatı',
      key: 'priceTRY',
      render: (_: any, record: B2BRequest) => (
        <Text delete type="secondary">
          {record.product?.priceTRY
            ? `${Number(record.product.priceTRY).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`
            : '—'}
        </Text>
      )
    },
    {
      title: 'B2B Fiyatı',
      key: 'b2bPrice',
      render: (_: any, record: B2BRequest) => (
        <Text strong style={{ color: '#389e0d' }}>
          {record.product?.b2bPrice
            ? `${Number(record.product.b2bPrice).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`
            : '—'}
        </Text>
      )
    },
    {
      title: 'Durum',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => statusTag(s)
    },
    {
      title: 'Tarih',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (d: string) => new Date(d).toLocaleDateString('tr-TR')
    }
  ];

  const tabItems = [
    {
      key: 'incoming',
      label: (
        <span>
          📥 Gelen Talepler
          {incoming.filter(r => r.status === 'pending').length > 0 && (
            <Tag color="orange" style={{ marginLeft: 8 }}>
              {incoming.filter(r => r.status === 'pending').length}
            </Tag>
          )}
        </span>
      ),
      children: loadingIncoming ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <Spin tip="Yükleniyor..." />
        </div>
      ) : incoming.length === 0 ? (
        <Empty description="Henüz gelen talep yok" />
      ) : (
        <Table
          columns={incomingColumns}
          dataSource={incoming}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          scroll={{ x: 700 }}
        />
      )
    },
    {
      key: 'outgoing',
      label: `📤 Gönderilen Talepler (${outgoing.length})`,
      children: loadingOutgoing ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <Spin tip="Yükleniyor..." />
        </div>
      ) : outgoing.length === 0 ? (
        <Empty description="Henüz gönderilen talep yok. B2B Ürün Keşfet sayfasından ürün talebinde bulunabilirsiniz." />
      ) : (
        <Table
          columns={outgoingColumns}
          dataSource={outgoing}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          scroll={{ x: 700 }}
        />
      )
    }
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>📋 B2B Talepleri</Title>
        <Text type="secondary">
          Gelen talepleri onaylayın veya reddedin; gönderdiğiniz taleplerin durumunu takip edin.
        </Text>
      </div>
      <Tabs defaultActiveKey="incoming" items={tabItems} />
    </div>
  );
};

export default B2BRequests;
