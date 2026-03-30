import React, { useState, useEffect } from 'react';
import {
  Card, Row, Col, Tag, Button, Empty, Spin, message,
  Typography, Input, Badge, Tooltip, Avatar, Modal,
  Drawer, Space, Select
} from 'antd';
import {
  ShopOutlined, TagOutlined, SearchOutlined,
  CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined,
  PlusCircleOutlined, GoldOutlined, LeftOutlined, RightOutlined,
  InfoCircleOutlined, EyeOutlined, InboxOutlined, PercentageOutlined,
  DollarOutlined
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
  const [noteModal, setNoteModal] = useState<{ visible: boolean; productId: string | null; variantId?: string | null }>({ visible: false, productId: null, variantId: null });
  const [noteText, setNoteText] = useState('');
  const [drawerProduct, setDrawerProduct] = useState<B2BProduct | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);

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

  const handleAddRequest = (productId: string, variantId?: string | null, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setNoteModal({ visible: true, productId, variantId });
  };

  const handleConfirmRequest = async () => {
    const { productId, variantId } = noteModal;
    if (!productId) return;
    setRequesting(productId);
    setNoteModal({ visible: false, productId: null, variantId: null });
    try {
      await createB2BRequest(productId, variantId || undefined, noteText || undefined);
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

  const openDetail = (product: B2BProduct) => {
    setDrawerProduct(product);
    setActiveImageIndex(0);
    if (product.hasVariants && product.variants?.length) {
      setSelectedVariant(product.variants[0].id);
    } else {
      setSelectedVariant(null);
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
      {/* Header */}
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
        style={{ marginBottom: 24, maxWidth: 420 }}
        size="large"
      />

      {filtered.length === 0 ? (
        <Empty description="B2B'ye açık ürün bulunamadı" />
      ) : (
        <Row gutter={[20, 20]}>
          {filtered.map(product => {
            const status = product.myRequestStatus;
            const discount = product.b2bDiscount;
            const hasImages = product.images && product.images.length > 0;

            return (
              <Col xs={24} sm={12} lg={8} xl={6} key={product.id}>
                <Card
                  hoverable
                  onClick={() => openDetail(product)}
                  bodyStyle={{ padding: '12px 16px' }}
                  style={{
                    borderRadius: 12,
                    overflow: 'hidden',
                    border: '1px solid #f0f0f0',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
                    transition: 'box-shadow 0.2s',
                    cursor: 'pointer',
                  }}
                  cover={
                    <div style={{ position: 'relative' }}>
                      {hasImages ? (
                        <img
                          alt={product.title}
                          src={product.images[0]}
                          style={{
                            width: '100%',
                            height: 220,
                            objectFit: 'cover',
                            display: 'block',
                          }}
                        />
                      ) : (
                        <div style={{
                          height: 220,
                          background: 'linear-gradient(135deg, #d4a017 0%, #f0d060 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexDirection: 'column',
                          gap: 8
                        }}>
                          <GoldOutlined style={{ fontSize: 52, color: '#fff' }} />
                          <Text style={{ color: '#fff', fontSize: 12, opacity: 0.85 }}>Görsel Yok</Text>
                        </div>
                      )}
                      {/* Image count badge */}
                      {hasImages && product.images.length > 1 && (
                        <div style={{
                          position: 'absolute', bottom: 8, right: 8,
                          background: 'rgba(0,0,0,0.55)', color: '#fff',
                          borderRadius: 12, padding: '2px 10px', fontSize: 11
                        }}>
                          +{product.images.length - 1} fotoğraf
                        </div>
                      )}
                      {/* Discount badge */}
                      <div style={{
                        position: 'absolute', top: 10, left: 10,
                        background: '#52c41a', color: '#fff',
                        borderRadius: 8, padding: '3px 10px', fontSize: 12, fontWeight: 700
                      }}>
                        %{discount} indirim
                      </div>
                      {/* Detail hint */}
                      <div style={{
                        position: 'absolute', top: 10, right: 10,
                        background: 'rgba(0,0,0,0.45)', color: '#fff',
                        borderRadius: 20, padding: '3px 10px', fontSize: 11,
                        display: 'flex', alignItems: 'center', gap: 4
                      }}>
                        <EyeOutlined style={{ fontSize: 11 }} /> Detay
                      </div>
                    </div>
                  }
                >
                  {/* Store info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Avatar size={22} icon={<ShopOutlined />} style={{ background: '#d4a017', flexShrink: 0 }} />
                    <Text type="secondary" style={{ fontSize: 12, flexShrink: 0 }}>{product.store.name}</Text>
                    <Tag icon={<TagOutlined />} color="gold" style={{ marginLeft: 'auto', fontSize: 11 }}>{product.category}</Tag>
                  </div>

                  {/* Title */}
                  <Tooltip title={product.title}>
                    <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}
                      ellipsis>
                      {product.title}
                    </Text>
                  </Tooltip>

                  {/* Gold details */}
                  {(product.gramHas || product.milyem) && (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
                      {product.milyem && (
                        <span style={{ fontSize: 10, background: '#fafafa', border: '1px solid #d9d9d9', borderRadius: 4, padding: '1px 6px' }}>
                          Alaşım: <strong>{product.milyem}</strong>
                        </span>
                      )}
                      {product.effectiveMilyem && product.effectiveMilyem !== product.milyem && (
                        <span style={{ fontSize: 10, background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 4, padding: '1px 6px', color: '#d4a017' }}>
                          Efektif: <strong>{product.effectiveMilyem}</strong>
                        </span>
                      )}
                      {product.gramHas && (
                        <span style={{ fontSize: 10, background: '#fff7e6', border: '1px solid #ffd591', borderRadius: 4, padding: '1px 6px', color: '#d46b08', fontWeight: 700 }}>
                          {Number(product.gramHas).toLocaleString('tr-TR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} gr has
                        </span>
                      )}
                      {product.gramWeight && (
                        <span style={{ fontSize: 10, background: '#f9f0ff', border: '1px solid #d3adf7', borderRadius: 4, padding: '1px 6px', color: '#531dab' }}>
                          {product.gramWeight} gr
                        </span>
                      )}
                    </div>
                  )}

                  {/* Price block */}
                  <div style={{
                    background: '#f6ffed',
                    borderRadius: 8,
                    padding: '8px 12px',
                    marginBottom: 12,
                    border: '1px solid #b7eb8f'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>Liste Fiyatı:</Text>
                      <Text style={{ fontSize: 12, textDecoration: 'line-through', color: '#999' }}>
                        {Number(product.priceTRY).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                      </Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 11, color: '#389e0d', fontWeight: 600 }}>B2B Fiyatı:</Text>
                      <Text strong style={{ fontSize: 16, color: '#389e0d' }}>
                        {Number(product.b2bPrice).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                      </Text>
                    </div>
                  </div>

                  {/* Stock */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      <InboxOutlined /> Stok: <strong>{product.quantity}</strong> adet
                    </Text>
                    {status && (
                      <Tag color={statusConfig[status].color} icon={statusConfig[status].icon} style={{ marginRight: 0 }}>
                        {statusConfig[status].label}
                      </Tag>
                    )}
                  </div>

                  {/* Action */}
                  {!status ? (
                    <Tooltip title="Bu ürünü kendi mağazana listeleme talebi gönder">
                      <Button
                        type="primary"
                        icon={<PlusCircleOutlined />}
                        block
                        loading={requesting === product.id}
                        onClick={e => {
                          if (product.hasVariants) {
                             e.stopPropagation();
                             openDetail(product);
                          } else {
                             handleAddRequest(product.id, null, e);
                          }
                        }}
                        style={{ background: '#d4a017', borderColor: '#d4a017', borderRadius: 8 }}
                      >
                        {product.hasVariants ? 'Varyasyon Seç' : 'Mağazama Ekle'}
                      </Button>
                    </Tooltip>
                  ) : (
                    <Button
                      type="default"
                      block
                      onClick={e => { e.stopPropagation(); openDetail(product); }}
                      icon={<InfoCircleOutlined />}
                      style={{ borderRadius: 8 }}
                    >
                      Detayları Gör
                    </Button>
                  )}
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      {/* ── Product Detail Drawer ── */}
      <Drawer
        open={!!drawerProduct}
        onClose={() => setDrawerProduct(null)}
        width={620}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar icon={<ShopOutlined />} style={{ background: '#d4a017' }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>{drawerProduct?.title}</div>
              <Text type="secondary" style={{ fontSize: 12 }}>{drawerProduct?.store.name}</Text>
            </div>
          </div>
        }
        extra={
          drawerProduct && !drawerProduct.myRequestStatus ? (
            <Button
              type="primary"
              icon={<PlusCircleOutlined />}
              loading={requesting === drawerProduct.id}
              onClick={() => handleAddRequest(drawerProduct.id, selectedVariant)}
              style={{ background: '#d4a017', borderColor: '#d4a017' }}
            >
              Mağazama Ekle
            </Button>
          ) : drawerProduct?.myRequestStatus ? (
            <Tag
              color={statusConfig[drawerProduct.myRequestStatus].color}
              icon={statusConfig[drawerProduct.myRequestStatus].icon}
              style={{ fontSize: 13, padding: '4px 12px' }}
            >
              {statusConfig[drawerProduct.myRequestStatus].label}
            </Tag>
          ) : null
        }
      >
        {drawerProduct && (
          <div>
            {/* Image Gallery */}
            {drawerProduct.images && drawerProduct.images.length > 0 ? (
              <div style={{ marginBottom: 24 }}>
                {/* Main image */}
                <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', marginBottom: 10 }}>
                  <img
                    src={drawerProduct.images[activeImageIndex]}
                    alt={drawerProduct.title}
                    style={{ width: '100%', height: 320, objectFit: 'cover', display: 'block' }}
                  />
                  {drawerProduct.images.length > 1 && (
                    <>
                      <Button
                        shape="circle"
                        icon={<LeftOutlined />}
                        size="small"
                        onClick={() => setActiveImageIndex(i => (i - 1 + drawerProduct.images.length) % drawerProduct.images.length)}
                        style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.85 }}
                      />
                      <Button
                        shape="circle"
                        icon={<RightOutlined />}
                        size="small"
                        onClick={() => setActiveImageIndex(i => (i + 1) % drawerProduct.images.length)}
                        style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.85 }}
                      />
                      <div style={{
                        position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)',
                        background: 'rgba(0,0,0,0.5)', color: '#fff', borderRadius: 20, padding: '2px 12px', fontSize: 12
                      }}>
                        {activeImageIndex + 1} / {drawerProduct.images.length}
                      </div>
                    </>
                  )}
                </div>
                {/* Thumbnails */}
                {drawerProduct.images.length > 1 && (
                  <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                    {drawerProduct.images.map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt={`${idx + 1}`}
                        onClick={() => setActiveImageIndex(idx)}
                        style={{
                          width: 64, height: 64, objectFit: 'cover', borderRadius: 8,
                          cursor: 'pointer', flexShrink: 0,
                          border: activeImageIndex === idx ? '2px solid #d4a017' : '2px solid transparent',
                          opacity: activeImageIndex === idx ? 1 : 0.7,
                          transition: 'all 0.2s'
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                height: 220, background: 'linear-gradient(135deg, #d4a017 0%, #f0d060 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 12, marginBottom: 24
              }}>
                <GoldOutlined style={{ fontSize: 64, color: '#fff' }} />
              </div>
            )}

            {/* Category & Tags */}
            <Space wrap style={{ marginBottom: 16 }}>
              <Tag icon={<TagOutlined />} color="gold" style={{ fontSize: 13 }}>{drawerProduct.category}</Tag>
              {drawerProduct.milyem && (
                <Tag color="default">Alaşım: {drawerProduct.milyem}</Tag>
              )}
              {drawerProduct.effectiveMilyem && drawerProduct.effectiveMilyem !== drawerProduct.milyem && (
                <Tag color="orange">Efektif: {drawerProduct.effectiveMilyem}</Tag>
              )}
            </Space>

            {/* Pricing Section */}
            <div style={{
              background: 'linear-gradient(135deg, #f6ffed, #fffbe6)',
              borderRadius: 12, padding: 16, marginBottom: 20,
              border: '1px solid #b7eb8f'
            }}>
              <Title level={5} style={{ marginTop: 0, marginBottom: 12, color: '#389e0d' }}>
                <DollarOutlined /> Fiyat Bilgileri
              </Title>
              <Row gutter={16}>
                <Col span={12}>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>Liste Fiyatı</Text>
                    <div style={{ fontSize: 18, color: '#999', textDecoration: 'line-through' }}>
                      {Number(drawerProduct.priceTRY).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                    </div>
                  </div>
                </Col>
                <Col span={12}>
                  <div>
                    <Text strong style={{ fontSize: 12, color: '#389e0d' }}>B2B Fiyatı</Text>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#389e0d' }}>
                      {Number(drawerProduct.b2bPrice).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                    </div>
                  </div>
                </Col>
              </Row>
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <PercentageOutlined style={{ color: '#52c41a' }} />
                <Text>
                  B2B İskontosu: <Tag color="green" style={{ fontWeight: 700 }}>%{drawerProduct.b2bDiscount}</Tag>
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  ({Number(drawerProduct.priceTRY - drawerProduct.b2bPrice).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺ tasarruf)
                </Text>
              </div>
            </div>

            {/* Product Details */}
            <div style={{
              background: '#fafafa', borderRadius: 12,
              padding: 16, marginBottom: 20, border: '1px solid #f0f0f0'
            }}>
              <Title level={5} style={{ marginTop: 0, marginBottom: 12 }}>
                <InfoCircleOutlined /> Ürün Detayları
              </Title>
              <Row gutter={[12, 12]}>
                {drawerProduct.gramWeight && (
                  <Col span={12}>
                    <div style={{ background: '#f9f0ff', borderRadius: 8, padding: '8px 12px', border: '1px solid #d3adf7' }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>Ağırlık</Text>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#531dab' }}>{drawerProduct.gramWeight} gr</div>
                    </div>
                  </Col>
                )}
                {drawerProduct.gramHas && (
                  <Col span={12}>
                    <div style={{ background: '#fff7e6', borderRadius: 8, padding: '8px 12px', border: '1px solid #ffd591' }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>Has Ağırlık</Text>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#d46b08' }}>
                        {Number(drawerProduct.gramHas).toLocaleString('tr-TR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} gr
                      </div>
                    </div>
                  </Col>
                )}
                <Col span={12}>
                  <div style={{ background: '#fff', borderRadius: 8, padding: '8px 12px', border: '1px solid #f0f0f0' }}>
                    <Text type="secondary" style={{ fontSize: 11 }}>Stok Adedi</Text>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{drawerProduct.quantity} adet</div>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ background: '#fff', borderRadius: 8, padding: '8px 12px', border: '1px solid #f0f0f0' }}>
                    <Text type="secondary" style={{ fontSize: 11 }}>USD Fiyatı</Text>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>
                      ${Number(drawerProduct.priceUSD).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </Col>
              </Row>
            </div>

            {/* Store info */}
            <div style={{
              background: '#fff', borderRadius: 12,
              padding: 16, marginBottom: 20, border: '1px solid #f0f0f0',
              display: 'flex', alignItems: 'center', gap: 12
            }}>
              <Avatar size={48} icon={<ShopOutlined />} style={{ background: '#d4a017', flexShrink: 0 }} />
              <div>
                <Text strong style={{ fontSize: 14 }}>{drawerProduct.store.name}</Text>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>Mağaza ID: {drawerProduct.store.id}</Text>
                </div>
              </div>
            </div>

            {drawerProduct.hasVariants && drawerProduct.variants && drawerProduct.variants.length > 0 && (
               <div style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 20, border: '1px solid #f0f0f0' }}>
                 <Title level={5} style={{ marginTop: 0, marginBottom: 12 }}>Varyasyon Seçimi</Title>
                 <Select
                    style={{ width: '100%' }}
                    value={selectedVariant}
                    onChange={v => setSelectedVariant(v)}
                    options={drawerProduct.variants.map((v: any) => ({
                       label: Object.entries(v.attributes).map(([ak, av]) => `${ak}: ${av}`).join(' - ') + ` (Stok: ${v.quantity})`,
                       value: v.id,
                       disabled: v.quantity <= 0
                    }))}
                 />
                 {selectedVariant && (
                    <div style={{ marginTop: 12 }}>
                      <Text type="secondary" style={{ fontSize: 13 }}>Seçili varyasyon liste fiyatı:</Text>
                      <div style={{ fontSize: 16, fontWeight: 600, color: '#389e0d' }}>
                        {Number(drawerProduct.variants.find((v:any) => v.id === selectedVariant)?.b2bPrice || drawerProduct.b2bPrice).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                      </div>
                    </div>
                 )}
               </div>
            )}

            {/* Action button at bottom */}
            {!drawerProduct.myRequestStatus ? (
              <Button
                type="primary"
                icon={<PlusCircleOutlined />}
                block
                size="large"
                loading={requesting === drawerProduct.id}
                onClick={() => handleAddRequest(drawerProduct.id, selectedVariant)}
                style={{ background: '#d4a017', borderColor: '#d4a017', borderRadius: 10, height: 48, fontSize: 15 }}
                disabled={drawerProduct.hasVariants && !selectedVariant}
              >
                Mağazama Ekle — Talep Gönder
              </Button>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <Tag
                  color={statusConfig[drawerProduct.myRequestStatus].color}
                  icon={statusConfig[drawerProduct.myRequestStatus].icon}
                  style={{ fontSize: 14, padding: '6px 18px' }}
                >
                  Talep Durumu: {statusConfig[drawerProduct.myRequestStatus].label}
                </Tag>
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* Note Modal */}
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
