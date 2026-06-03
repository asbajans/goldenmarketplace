import { useEffect, useState } from 'react';
import { Card, Row, Col, Button, Statistic, Table, message, Spin, Progress, Tag } from 'antd';
import { ThunderboltOutlined, ShoppingCartOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { getCreditBalance, getCreditPrices, purchaseCredits, getAITasks } from '../api/ai';

interface CreditBalance {
  monthlyLimit: number;
  monthlyUsed: number;
  monthlyRemaining: number;
  purchasedBalance: number;
  totalRemaining: number;
}

interface CreditPack {
  credits: number;
  price: number;
}

export default function AICreditsPage() {
  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [packs, setPacks] = useState<CreditPack[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [bal, prices, taskList] = await Promise.all([
        getCreditBalance(),
        getCreditPrices(),
        getAITasks()
      ]);
      setBalance(bal);
      setPacks(prices.packs || []);
      setTasks(Array.isArray(taskList) ? taskList : []);
    } catch {
      message.error('Kredi bilgileri yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (pack: CreditPack) => {
    setPurchasing(`${pack.credits}`);
    try {
      const res = await purchaseCredits(pack.credits, pack.price);
      message.success(res.message);
      loadData();
    } catch (err: any) {
      message.error(err?.response?.data?.error || 'Satın alma başarısız');
    } finally {
      setPurchasing(null);
    }
  };

  const statusColor: Record<string, string> = {
    pending: 'orange', processing: 'blue', completed: 'green', failed: 'red'
  };
  const statusIcon: Record<string, any> = {
    pending: <ClockCircleOutlined />, processing: <ClockCircleOutlined spin />,
    completed: <CheckCircleOutlined />, failed: <CloseCircleOutlined />
  };

  if (loading) return <Spin size="large" style={{ display: 'flex', justifyContent: 'center', marginTop: 100 }} />;

  return (
    <div>
      <Card title={<><ThunderboltOutlined style={{ color: '#722ed1', marginRight: 8 }} />AI Kredileri</>} style={{ marginBottom: 24 }}>
        <Row gutter={24}>
          <Col span={6}>
            <Statistic
              title="Aylık Kalan"
              value={balance?.monthlyRemaining || 0}
              suffix={`/ ${balance?.monthlyLimit || 0}`}
              valueStyle={{ color: (balance?.monthlyRemaining || 0) > 0 ? '#52c41a' : '#ff4d4f' }}
            />
            <Progress
              percent={balance?.monthlyLimit ? Math.round(((balance?.monthlyUsed || 0) / balance.monthlyLimit) * 100) : 0}
              size="small"
              status={(balance?.monthlyRemaining || 0) > 0 ? 'active' : 'exception'}
            />
          </Col>
          <Col span={6}>
            <Statistic title="Satın Alınan" value={balance?.purchasedBalance || 0} suffix="kredi" />
          </Col>
          <Col span={6}>
            <Statistic
              title="Toplam Kalan"
              value={balance?.totalRemaining || 0}
              suffix="kredi"
              valueStyle={{ color: '#722ed1', fontWeight: 'bold' }}
            />
          </Col>
        </Row>
      </Card>

      <Card title="Kredi Yükle" style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          {packs.map((pack) => (
            <Col key={pack.credits} span={6}>
              <Card
                hoverable
                size="small"
                style={{ textAlign: 'center', borderColor: '#d4a017' }}
              >
                <Statistic
                  title="Kredi"
                  value={pack.credits}
                  suffix="kredi"
                  valueStyle={{ color: '#722ed1', fontSize: 28 }}
                />
                <div style={{ margin: '12px 0', color: '#888' }}>
                  {pack.price} TL
                </div>
                <Button
                  type="primary"
                  block
                  icon={<ShoppingCartOutlined />}
                  loading={purchasing === `${pack.credits}`}
                  onClick={() => handlePurchase(pack)}
                  style={{ backgroundColor: '#722ed1', borderColor: '#722ed1' }}
                >
                  Satın Al
                </Button>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      <Card title="AI İşlem Geçmişi">
        <Table
          dataSource={tasks}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          columns={[
            { title: 'Ürün', dataIndex: ['product', 'title'], render: (_t: string, r: any) => r.product?.title || r.productId, ellipsis: true },
            { title: 'SKU', dataIndex: ['product', 'sku'], render: (s: string) => s || '-' },
            { title: 'İşlem', dataIndex: 'taskType', render: (t: string) => t === 'translate' ? 'Çeviri' : t === 'generate_content' ? 'İçerik' : 'Çeviri + İçerik' },
            {
              title: 'Durum', dataIndex: 'status',
              render: (s: string) => (
                <Tag icon={statusIcon[s]} color={statusColor[s] || 'default'}>
                  {s === 'pending' ? 'Bekliyor' : s === 'processing' ? 'İşleniyor' : s === 'completed' ? 'Tamamlandı' : 'Hata'}
                </Tag>
              )
            },
            { title: 'Kredi', dataIndex: 'creditsConsumed', render: (c: number) => c || '-' },
            {
              title: 'Tarih', dataIndex: 'createdAt',
              render: (d: string) => d ? new Date(d).toLocaleString('tr-TR') : '-'
            }
          ]}
        />
      </Card>
    </div>
  );
}
