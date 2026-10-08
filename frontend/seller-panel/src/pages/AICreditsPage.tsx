import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, Row, Col, Button, Statistic, Table, message, Spin, Progress, Tag, Radio, Modal, Alert } from 'antd';
import { ThunderboltOutlined, ShoppingCartOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, BankOutlined, CreditCardOutlined } from '@ant-design/icons';
import { getCreditBalance, getCreditPrices, checkoutCredits, getAITasks } from '../api/ai';
import { getMySubscription } from '../api/subscription';

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
  const [payMethods, setPayMethods] = useState<any>(null);
  const [buyPack, setBuyPack] = useState<CreditPack | null>(null);
  const [buyProvider, setBuyProvider] = useState<'stripe' | 'bank'>('bank');
  const [searchParams] = useSearchParams();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [bal, prices, taskList, me] = await Promise.all([
        getCreditBalance(),
        getCreditPrices(),
        getAITasks(),
        getMySubscription().catch(() => null)
      ]);
      setBalance(bal);
      setPacks(prices.packs || []);
      setTasks(Array.isArray(taskList) ? taskList : []);
      setPayMethods(me?.paymentMethods || null);
      if (me?.paymentMethods?.cardEnabled && me?.paymentMethods?.provider === 'stripe') {
        setBuyProvider('stripe');
      }
    } catch {
      message.error('Kredi bilgileri yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!buyPack) return;
    const pack = buyPack;
    setPurchasing(`${pack.credits}`);
    try {
      const res = await checkoutCredits(pack.credits, buyProvider);
      setBuyPack(null);
      if (res.url) {
        window.location.href = res.url;
      } else {
        Modal.success({
          title: 'Talebiniz Alındı',
          content: (
            <div>
              <p>{res.message}</p>
              {res.bank && (res.bank.iban || res.bank.name) && (
                <Alert
                  type="info"
                  showIcon
                  style={{ marginTop: 8 }}
                  message={`Havale bilgileri — ${res.bank.name || ''} ${res.bank.branch || ''} / Alıcı: ${res.bank.accountName || ''} / IBAN: ${res.bank.iban || ''}`}
                />
              )}
            </div>
          ),
          onOk: () => loadData()
        });
        loadData();
      }
    } catch (err: any) {
      message.error(err?.response?.data?.error || 'Satın alma başlatılamadı');
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
      {searchParams.get('cancelled') === '1' && (
        <Alert type="warning" showIcon closable style={{ marginBottom: 16 }} message="Kart ödemesi yarıda bırakıldı. Dilerseniz havale/EFT ile devam edebilirsiniz." />
      )}
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
                <div style={{ margin: '12px 0', color: '#888', fontSize: 16, fontWeight: 600 }}>
                  ${pack.price} USD
                </div>
                <Button
                  type="primary"
                  block
                  icon={<ShoppingCartOutlined />}
                  loading={purchasing === `${pack.credits}`}
                  onClick={() => setBuyPack(pack)}
                  style={{ backgroundColor: '#722ed1', borderColor: '#722ed1' }}
                >
                  Satın Al
                </Button>
              </Card>
            </Col>
          ))}
        </Row>
        {packs.length === 0 && (
          <Alert type="warning" showIcon message="Şu an satışta kredi paketi tanımlı değil. Lütfen yöneticiyle iletişime geçin." />
        )}
      </Card>

      <Modal
        title={`${buyPack?.credits} Kredi — Ödeme`}
        open={!!buyPack}
        onCancel={() => setBuyPack(null)}
        onOk={handlePurchase}
        confirmLoading={!!purchasing}
        okText="Ödemeye Geç"
        cancelText="Vazgeç"
      >
        {buyPack && (
          <>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>${buyPack.price} USD</div>
            <Radio.Group value={buyProvider} onChange={e => setBuyProvider(e.target.value)} style={{ width: '100%' }}>
              {payMethods?.cardEnabled && payMethods?.provider === 'stripe' && (
                <Radio.Button value="stripe" style={{ width: '50%', textAlign: 'center' }}>
                  <CreditCardOutlined /> Kart (Stripe)
                </Radio.Button>
              )}
              {payMethods?.bankEnabled !== false && (
                <Radio.Button value="bank" style={{ width: payMethods?.cardEnabled ? '50%' : '100%', textAlign: 'center' }}>
                  <BankOutlined /> Havale / EFT
                </Radio.Button>
              )}
            </Radio.Group>
            {buyProvider === 'bank' && (
              <Alert type="info" showIcon style={{ marginTop: 16 }} message="Havale sonrası admin onayıyla kredileriniz bakiyenize eklenir." />
            )}
            {buyProvider === 'stripe' && (
              <Alert type="info" showIcon style={{ marginTop: 16 }} message="Stripe ödeme sayfasına yönlendirileceksiniz. Ödeme doğrulanınca krediler otomatik yüklenir." />
            )}
          </>
        )}
      </Modal>

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
