import React, { useState, useEffect } from 'react';
import {
  Card, Row, Col, Tag, Button, Empty, Spin, message,
  Typography, Input, Badge, Tooltip, Avatar, Modal
} from 'antd';
import {
  ShopOutlined, TagOutlined, SearchOutlined,
  CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined,
  PlusCircleOutlined, GoldOutlined
} from '@ant-design/icons';
import {
  getB2BProducts, createB2BRequest,
  type B2BProduct
} from '../api/b2b';

const { Title, Text } = Typography;
const { Search } = Input;

const statusConfig = {
  pending: { color: 'orange', icon: <ClockCircleOutlined />, label: 'Beklemede' },
  approved: { color: 'green', icon: <CheckCircleOutlined />, label: 'Onaylandı' },
  rejected: { color: 'red', icon: <CloseCircleOutlined />, label: 'Reddedildi' }
};

const B2BMarket: React.FC = () => {
  const [products, setProducts] = useState<B2BProduct[]>([]);
  const [filtered, setFiltered] = useState<B2BProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [noteModal, setNoteModal] = useState<{ visible: boolean; productId: string | null }>({ visible: false, productId: null });
  const [noteText, setNoteText] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(products.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.store.name.toLowerCase().includes(q)
    ));
  }, [search, products]);

  const fetchProducts = async () => {
    try {
      const { data } = await getB2BProducts();
      const productsData = Array.isArray(data) ? data : ((data as any)?.data || []);
      setProducts(productsData);
      setFiltered(productsData);
    } catch {
      message.error('B2B ürünler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRequest = (productId: string) => {
    setNoteModal({ visible: true, productId });
  };

  const handleConfirmRequest = async () => {
    const { productId } = noteModal;
    if (!productId) return;
    setRequesting(productId);
    setNoteModal({ visible: false, productId: null });
    try {
      await createB2BRequest(productId, noteText || undefined);
      message.success('Talep gönderildi! Ürün sahibinin onayı bekleniyor.');
      setNoteText('');
      fetchProducts();
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Talep gönderilemedi';
      if (err?.response?.status === 409) {
        message.warning(`Zaten bir talebiniz var: ${err.response.data.status}`);
      } else {
        message.error(msg);
      }
    } finally {
      setRequesting(null);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spin size="large" tip="B2B ürünler yükleniyor..." />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            🤝 B2B Ürün Keşfet
          </Title>
          <Text type="secondary">
            Diğer satıcıların B2B'ye açık ürünlerini kendi mağazana ekle
          </Text>
        </div>
        <Badge count={filtered.length} overflowCount={999} style={{ backgroundColor: '#52c41a' }}>
          <Tag color="green" icon={<GoldOutlined />} style={{ fontSize: 13, padding: '4px 12px' }}>
            Toplam Ürün
          </Tag>
        </Badge>
      </div>

      <Search
        placeholder="Ürün, kategori veya mağaza ara..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        allowClear
        prefix={<SearchOutlined />}
        style={{ marginBottom: 24, maxWidth: 400 }}
      />

      {filtered.length === 0 ? (
        <Empty description="B2B'ye açık ürün bulunamadı" />
      ) : (
        <Row gutter={[16, 16]}>
          {filtered.map(product => {
            const status = product.myRequestStatus;
            const discount = product.b2bDiscount;

            return (
              <Col xs={24} sm={12} lg={8} xl={6} key={product.id}>
                <Card
                  hoverable
                  cover={
                    product.images?.[0] ? (
                      <img
                        alt={product.title}
                        src={product.images[0]}
                        style={{ height: 180, objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{
                        height: 180, background: 'linear-gradient(135deg, #d4a017 0%, #f0d060 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <GoldOutlined style={{ fontSize: 48, color: '#fff' }} />
                      </div>
                    )
                  }
                  actions={[
                    status ? (
                      <Tag
                        key="status"
                        color={statusConfig[status].color}
                        icon={statusConfig[status].icon}
                        style={{ margin: 0 }}
                      >
                        {statusConfig[status].label}
                      </Tag>
                    ) : (
                      <Tooltip key="add" title="Bu ürünü kendi mağazana listeleme talebi gönder">
                        <Button
                          type="primary"
                          icon={<PlusCircleOutlined />}
                          loading={requesting === product.id}
                          onClick={() => handleAddRequest(product.id)}
                          style={{ background: '#d4a017', borderColor: '#d4a017' }}
                        >
                          Mağazama Ekle
                        </Button>
                      </Tooltip>
                    )
                  ]}
                >
                  <Card.Meta
                    avatar={
                      <Avatar icon={<ShopOutlined />} style={{ background: '#d4a017' }} />
                    }
                    title={
                      <Tooltip title={product.title}>
                        <span style={{ fontSize: 13 }}>{product.title}</span>
                      </Tooltip>
                    }
                    description={
                      <div>
                        <Tag icon={<TagOutlined />} color="gold">{product.category}</Tag>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {product.store.name}
                        </Text>
                      </div>
                    }
                  />
                  <div style={{ marginTop: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>Satış Fiyatı:</Text>
                      <Text style={{ fontSize: 13, color: '#666' }}>
                        {Number(product.priceTRY).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                      </Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 11, color: '#389e0d', fontWeight: 600 }}>B2B Fiyatı:</Text>
                      <div>
                        <Tag color="green" style={{ marginRight: 4, fontSize: 10 }}>%{discount} iskonto</Tag>
                        <Text strong style={{ fontSize: 15, color: '#389e0d' }}>
                          {Number(product.b2bPrice).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                        </Text>
                      </div>
                    </div>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      <Modal
        title="Mağazama Ekle — Talep Notu"
        open={noteModal.visible}
        onOk={handleConfirmRequest}
        onCancel={() => { setNoteModal({ visible: false, productId: null }); setNoteText(''); }}
        okText="Talebi Gönder"
        cancelText="İptal"
        okButtonProps={{ style: { background: '#d4a017', borderColor: '#d4a017' } }}
      >
        <p style={{ marginBottom: 8 }}>
          Ürün sahibine bir not eklemek ister misiniz? (isteğe bağlı)
        </p>
        <Input.TextArea
          rows={3}
          placeholder="Örn: Bu ürünü mağazamda satmak istiyorum, fiyat anlaşması yapalım..."
          value={noteText}
          onChange={e => setNoteText(e.target.value)}
        />
      </Modal>
    </div>
  );
};

export default B2BMarket;
