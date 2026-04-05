import React, { useState, useEffect } from 'react';
import {
  Card, Row, Col, Tag, Button, Empty, Spin, Typography,
  Avatar, Divider, Drawer, Space, Tooltip
} from 'antd';
import {
  ShopOutlined, TagOutlined, GoldOutlined,
  EyeInvisibleOutlined, UserAddOutlined, StarOutlined,
  LeftOutlined, RightOutlined, InfoCircleOutlined,
  PercentageOutlined, InboxOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { getStoreProducts } from '../api/b2b';

const { Title, Text } = Typography;

const REGISTER_URL = '/register';
const LOGIN_URL = '/login';

const StoreStorefront: React.FC = () => {
  const { storeSlug } = useParams<{ storeSlug: string }>();
  const navigate = useNavigate();
  const [store, setStore] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuth, setIsAuth] = useState(false);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 24, total: 0, pages: 1 });

  // Detail drawer state
  const [drawer, setDrawer] = useState<any | null>(null);
  const [activeImg, setActiveImg] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
    setIsAuth(!!token);
  }, []);

  useEffect(() => {
    if (!storeSlug) return;
    fetchPage(1);
  }, [storeSlug]);

  const fetchPage = async (page: number) => {
    setLoading(true);
    try {
      const { data: res } = await getStoreProducts(storeSlug!, { page, limit: 24 });
      setStore(res.store);
      setProducts(res.data);
      setIsAuth(res.isAuthenticated);
      if (res.pagination) setPagination(res.pagination);
    } catch (e: any) {
      setError(e?.response?.status === 404 ? 'Mağaza bulunamadı' : 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const openDrawer = (product: any) => {
    setDrawer(product);
    setActiveImg(0);
  };

  if (loading && !store) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Spin size="large" tip="Mağaza yükleniyor..." />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: 600, margin: '80px auto', textAlign: 'center' }}>
        <Title level={3} style={{ color: '#ff4d4f' }}>{error}</Title>
        <Button type="primary" onClick={() => navigate('/')}>Ana Sayfaya Dön</Button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
      {/* Store Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)',
        borderRadius: 16, padding: '32px 40px', marginBottom: 32,
        display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap'
      }}>
        <Avatar
          size={80}
          src={store?.logo}
          icon={!store?.logo && <ShopOutlined />}
          style={{ background: '#d4a017', border: '3px solid #d4a017', flexShrink: 0 }}
        />
        <div style={{ flex: 1 }}>
          <Title level={2} style={{ color: '#fff', margin: 0, marginBottom: 6 }}>
            {store?.storeName}
          </Title>
          {store?.description && (
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14 }}>{store.description}</Text>
          )}
          <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
            <Tag color="gold" style={{ fontSize: 13, padding: '2px 10px' }}>
              <StarOutlined /> {store?.rating?.toFixed(1) || '0.0'} Puan
            </Tag>
            <Tag style={{ fontSize: 13, padding: '2px 10px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}>
              {pagination.total} Ürün
            </Tag>
          </div>
        </div>

        {!isAuth && (
          <div style={{
            background: 'rgba(212, 160, 23, 0.15)', border: '1px solid rgba(212,160,23,0.4)',
            borderRadius: 12, padding: '16px 20px', minWidth: 240,
            display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center'
          }}>
            <EyeInvisibleOutlined style={{ fontSize: 28, color: '#d4a017' }} />
            <Text style={{ color: '#fff', textAlign: 'center', fontSize: 13 }}>
              Fiyatları görüntülemek için üye olun veya giriş yapın
            </Text>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button type="primary" size="small" icon={<UserAddOutlined />}
                onClick={() => navigate(REGISTER_URL)}
                style={{ background: '#d4a017', borderColor: '#d4a017' }}>
                Üye Ol
              </Button>
              <Button size="small" ghost onClick={() => navigate(LOGIN_URL)}
                style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.5)' }}>
                Giriş Yap
              </Button>
            </div>
          </div>
        )}
      </div>

      <Divider style={{ marginBottom: 28 }} />

      {/* Products Grid */}
      {products.length === 0 && !loading ? (
        <Empty description="Bu mağazada henüz B2B ürünü yok" style={{ marginTop: 60 }} />
      ) : (
        <Row gutter={[20, 20]}>
          {products.map((product: any) => {
            const hasImages = product.images && product.images.length > 0;
            return (
              <Col xs={24} sm={12} md={8} lg={6} key={product.id}>
                <Card
                  hoverable
                  onClick={() => openDrawer(product)}
                  bodyStyle={{ padding: '12px 16px' }}
                  style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #f0f0f0', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', cursor: 'pointer' }}
                  cover={
                    <div style={{ position: 'relative' }}>
                      {hasImages ? (
                        <img alt={product.title} src={product.images[0]}
                          style={{ width: '100%', height: 220, objectFit: 'cover', display: 'block' }} />
                      ) : (
                        <div style={{ height: 220, background: 'linear-gradient(135deg, #d4a017 0%, #f0d060 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <GoldOutlined style={{ fontSize: 52, color: '#fff' }} />
                        </div>
                      )}
                      <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.45)', color: '#fff', borderRadius: 20, padding: '3px 10px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <InfoCircleOutlined style={{ fontSize: 11 }} /> Detay
                      </div>
                      <Tag color="gold" icon={<TagOutlined />} style={{ position: 'absolute', bottom: 8, left: 8, fontSize: 11 }}>
                        {product.category}
                      </Tag>
                    </div>
                  }
                >
                  <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 6 }} ellipsis>
                    {product.title}
                  </Text>

                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
                    {product.milyem && (
                      <span style={{ fontSize: 10, background: '#fafafa', border: '1px solid #d9d9d9', borderRadius: 4, padding: '1px 6px' }}>
                        {product.milyem} ayar
                      </span>
                    )}
                    {product.gramWeight && (
                      <span style={{ fontSize: 10, background: '#f9f0ff', border: '1px solid #d3adf7', borderRadius: 4, padding: '1px 6px', color: '#531dab' }}>
                        {product.gramWeight} gr
                      </span>
                    )}
                  </div>

                  {/* Price — auth only */}
                  {isAuth ? (
                    <div style={{ background: '#f6ffed', borderRadius: 8, padding: '8px 12px', border: '1px solid #b7eb8f', marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text type="secondary" style={{ fontSize: 11 }}>Satış:</Text>
                        <Text style={{ fontSize: 12, textDecoration: 'line-through', color: '#999' }}>
                          {Number(product.priceTRY).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                        </Text>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                        <Text style={{ fontSize: 11, color: '#389e0d', fontWeight: 600 }}>B2B:</Text>
                        <Text strong style={{ fontSize: 15, color: '#389e0d' }}>
                          {Number(product.b2bPrice).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                        </Text>
                      </div>
                    </div>
                  ) : (
                    <Tooltip title="Fiyatı görmek için üye olun">
                      <div onClick={(e) => { e.stopPropagation(); navigate(REGISTER_URL); }}
                        style={{ background: 'linear-gradient(135deg, #1a1a2e, #0f3460)', borderRadius: 8, padding: '10px 12px', marginBottom: 12, cursor: 'pointer', border: '1px dashed #d4a017', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <EyeInvisibleOutlined style={{ color: '#d4a017' }} />
                        <Text style={{ color: '#d4a017', fontSize: 12, fontWeight: 600 }}>Fiyatı Gör → Üye Ol</Text>
                      </div>
                    </Tooltip>
                  )}

                  <Button block size="small" icon={<InfoCircleOutlined />} style={{ borderRadius: 6 }}>
                    Detayları Gör
                  </Button>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div style={{ textAlign: 'center', marginTop: 40, display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
          {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(p => (
            <Button key={p} type={p === pagination.page ? 'primary' : 'default'} size="small"
              onClick={() => fetchPage(p)}
              style={p === pagination.page ? { background: '#d4a017', borderColor: '#d4a017' } : {}}>
              {p}
            </Button>
          ))}
        </div>
      )}

      {/* Footer CTA */}
      {!isAuth && products.length > 0 && (
        <div style={{ marginTop: 48, background: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)', borderRadius: 16, padding: '40px 32px', textAlign: 'center' }}>
          <Title level={3} style={{ color: '#fff', marginBottom: 8 }}>Bu mağazanın ürünleri ile ilgileniyor musunuz?</Title>
          <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 15, display: 'block', marginBottom: 24 }}>
            Ücretsiz satıcı hesabı açın, fiyatları görün ve B2B listeleme talebi gönderin.
          </Text>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button type="primary" size="large" icon={<UserAddOutlined />} onClick={() => navigate(REGISTER_URL)}
              style={{ background: '#d4a017', borderColor: '#d4a017', height: 44, paddingInline: 28, fontSize: 15 }}>
              Ücretsiz Kayıt Ol
            </Button>
            <Button size="large" ghost onClick={() => navigate(LOGIN_URL)}
              style={{ height: 44, paddingInline: 28, fontSize: 15, color: '#fff', borderColor: 'rgba(255,255,255,0.5)' }}>
              Zaten Üyeyim
            </Button>
          </div>
        </div>
      )}

      {/* ── Product Detail Drawer ── */}
      <Drawer
        open={!!drawer}
        onClose={() => setDrawer(null)}
        width={580}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar icon={<ShopOutlined />} style={{ background: '#d4a017' }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>{drawer?.title}</div>
              <Text type="secondary" style={{ fontSize: 12 }}>{store?.storeName}</Text>
            </div>
          </div>
        }
      >
        {drawer && (
          <div>
            {/* Image gallery */}
            {drawer.images && drawer.images.length > 0 ? (
              <div style={{ marginBottom: 20 }}>
                <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', marginBottom: 10 }}>
                  <img src={drawer.images[activeImg]} alt={drawer.title}
                    style={{ width: '100%', height: 300, objectFit: 'cover', display: 'block' }} />
                  {drawer.images.length > 1 && (
                    <>
                      <Button shape="circle" icon={<LeftOutlined />} size="small"
                        onClick={() => setActiveImg(i => (i - 1 + drawer.images.length) % drawer.images.length)}
                        style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.85 }} />
                      <Button shape="circle" icon={<RightOutlined />} size="small"
                        onClick={() => setActiveImg(i => (i + 1) % drawer.images.length)}
                        style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.85 }} />
                      <div style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.5)', color: '#fff', borderRadius: 20, padding: '2px 12px', fontSize: 12 }}>
                        {activeImg + 1} / {drawer.images.length}
                      </div>
                    </>
                  )}
                </div>
                {drawer.images.length > 1 && (
                  <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                    {drawer.images.map((img: string, idx: number) => (
                      <img key={idx} src={img} alt={`${idx + 1}`} onClick={() => setActiveImg(idx)}
                        style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, cursor: 'pointer', flexShrink: 0, border: activeImg === idx ? '2px solid #d4a017' : '2px solid transparent', opacity: activeImg === idx ? 1 : 0.7, transition: 'all 0.2s' }} />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ height: 200, background: 'linear-gradient(135deg, #d4a017 0%, #f0d060 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12, marginBottom: 20 }}>
                <GoldOutlined style={{ fontSize: 64, color: '#fff' }} />
              </div>
            )}

            {/* Category & specs */}
            <Space wrap style={{ marginBottom: 16 }}>
              <Tag icon={<TagOutlined />} color="gold" style={{ fontSize: 13 }}>{drawer.category}</Tag>
              {drawer.milyem && <Tag color="default">Alaşım: {drawer.milyem}</Tag>}
              {drawer.effectiveMilyem && drawer.effectiveMilyem !== drawer.milyem && (
                <Tag color="orange">Efektif: {drawer.effectiveMilyem}</Tag>
              )}
            </Space>

            {/* Gold specs row */}
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
              {drawer.gramWeight && (
                <Col span={12}>
                  <div style={{ background: '#f9f0ff', borderRadius: 8, padding: '8px 12px', border: '1px solid #d3adf7' }}>
                    <Text type="secondary" style={{ fontSize: 11 }}>Ağırlık</Text>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#531dab' }}>{drawer.gramWeight} gr</div>
                  </div>
                </Col>
              )}
              {drawer.gramHas && isAuth && (
                <Col span={12}>
                  <div style={{ background: '#fff7e6', borderRadius: 8, padding: '8px 12px', border: '1px solid #ffd591' }}>
                    <Text type="secondary" style={{ fontSize: 11 }}>Has Ağırlık</Text>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#d46b08' }}>
                      {Number(drawer.gramHas).toLocaleString('tr-TR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} gr
                    </div>
                  </div>
                </Col>
              )}
            </Row>

            {/* Price section */}
            {isAuth ? (
              <div style={{ background: 'linear-gradient(135deg, #f6ffed, #fffbe6)', borderRadius: 12, padding: 16, marginBottom: 20, border: '1px solid #b7eb8f' }}>
                <Title level={5} style={{ marginTop: 0, marginBottom: 12, color: '#389e0d' }}>
                  <PercentageOutlined /> Fiyat Bilgileri
                </Title>
                <Row gutter={16}>
                  <Col span={12}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Liste Fiyatı</Text>
                    <div style={{ fontSize: 18, color: '#999', textDecoration: 'line-through' }}>
                      {Number(drawer.priceTRY).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                    </div>
                  </Col>
                  <Col span={12}>
                    <Text strong style={{ fontSize: 12, color: '#389e0d' }}>B2B Fiyatı</Text>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#389e0d' }}>
                      {Number(drawer.b2bPrice).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                    </div>
                  </Col>
                </Row>
                {drawer.b2bDiscount > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <Tag color="green" style={{ fontWeight: 700 }}>%{drawer.b2bDiscount} B2B İndirim</Tag>
                  </div>
                )}
                {drawer.quantity !== undefined && (
                  <div style={{ marginTop: 8 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      <InboxOutlined /> Stok: <strong>{drawer.quantity}</strong> adet
                    </Text>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ background: 'linear-gradient(135deg, #1a1a2e, #0f3460)', borderRadius: 12, padding: 20, marginBottom: 20, textAlign: 'center', border: '1px dashed #d4a017' }}>
                <EyeInvisibleOutlined style={{ fontSize: 32, color: '#d4a017', marginBottom: 8 }} />
                <div style={{ color: '#fff', fontSize: 14, marginBottom: 12 }}>
                  Fiyat ve stok bilgisi için üye olun
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                  <Button type="primary" icon={<UserAddOutlined />} onClick={() => navigate(REGISTER_URL)}
                    style={{ background: '#d4a017', borderColor: '#d4a017' }}>Üye Ol</Button>
                  <Button ghost onClick={() => navigate(LOGIN_URL)}
                    style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.5)' }}>Giriş Yap</Button>
                </div>
              </div>
            )}

            {/* CTA if auth */}
            {isAuth && (
              <Button type="primary" block size="large" onClick={() => { setDrawer(null); navigate('/b2b/market'); }}
                style={{ background: '#d4a017', borderColor: '#d4a017', borderRadius: 10, height: 48, fontSize: 15 }}>
                B2B Pazarında Görüntüle & Talep Et
              </Button>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default StoreStorefront;
