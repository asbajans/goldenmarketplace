import React, { useState, useEffect } from 'react';
import {
  Card, Row, Col, Tag, Button, Empty, Spin, Typography,
  Avatar, Divider, Badge, Tooltip
} from 'antd';
import {
  ShopOutlined, TagOutlined, GoldOutlined,
  EyeInvisibleOutlined, UserAddOutlined, StarOutlined
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

  useEffect(() => {
    // Check local auth token
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
    setIsAuth(!!token);
  }, []);

  useEffect(() => {
    if (!storeSlug) return;
    const fetch = async () => {
      setLoading(true);
      try {
        const { data: res } = await getStoreProducts(storeSlug, { page: 1, limit: 24 });
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
    fetch();
  }, [storeSlug]);

  const loadMore = async (page: number) => {
    if (!storeSlug) return;
    setLoading(true);
    try {
      const { data: res } = await getStoreProducts(storeSlug, { page, limit: 24 });
      setProducts(res.data);
      if (res.pagination) setPagination(res.pagination);
    } catch {}
    setLoading(false);
  };

  if (loading) {
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
            <Badge
              count={<StarOutlined style={{ color: '#d4a017' }} />}
              style={{ backgroundColor: 'transparent' }}
            >
              <Tag color="gold" style={{ fontSize: 13, padding: '2px 10px' }}>
                {store?.rating?.toFixed(1) || '0.0'} Puan
              </Tag>
            </Badge>
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
              <Button
                type="primary"
                size="small"
                icon={<UserAddOutlined />}
                onClick={() => navigate(REGISTER_URL)}
                style={{ background: '#d4a017', borderColor: '#d4a017' }}
              >
                Üye Ol
              </Button>
              <Button
                size="small"
                ghost
                onClick={() => navigate(LOGIN_URL)}
                style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.5)' }}
              >
                Giriş Yap
              </Button>
            </div>
          </div>
        )}
      </div>

      <Divider style={{ marginBottom: 28 }} />

      {/* Products Grid */}
      {products.length === 0 ? (
        <Empty description="Bu mağazada henüz B2B ürünü yok" style={{ marginTop: 60 }} />
      ) : (
        <Row gutter={[20, 20]}>
          {products.map((product: any) => {
            const hasImages = product.images && product.images.length > 0;
            return (
              <Col xs={24} sm={12} md={8} lg={6} key={product.id}>
                <Card
                  hoverable
                  bodyStyle={{ padding: '12px 16px' }}
                  style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #f0f0f0', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}
                  cover={
                    <div style={{ position: 'relative' }}>
                      {hasImages ? (
                        <img
                          alt={product.title}
                          src={product.images[0]}
                          style={{ width: '100%', height: 220, objectFit: 'cover', display: 'block' }}
                        />
                      ) : (
                        <div style={{
                          height: 220, background: 'linear-gradient(135deg, #d4a017 0%, #f0d060 100%)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          <GoldOutlined style={{ fontSize: 52, color: '#fff' }} />
                        </div>
                      )}
                      <Tag
                        color="gold"
                        icon={<TagOutlined />}
                        style={{ position: 'absolute', bottom: 8, left: 8, fontSize: 11 }}
                      >
                        {product.category}
                      </Tag>
                    </div>
                  }
                >
                  <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 6 }} ellipsis>
                    {product.title}
                  </Text>

                  {/* Gold specs — always visible */}
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

                  {/* Price section — conditional on auth */}
                  {isAuth ? (
                    <div style={{
                      background: '#f6ffed', borderRadius: 8, padding: '8px 12px',
                      border: '1px solid #b7eb8f', marginBottom: 12
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text type="secondary" style={{ fontSize: 11 }}>Satış Fiyatı:</Text>
                        <Text style={{ fontSize: 12, textDecoration: 'line-through', color: '#999' }}>
                          {Number(product.priceTRY).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                        </Text>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                        <Text style={{ fontSize: 11, color: '#389e0d', fontWeight: 600 }}>B2B Fiyatı:</Text>
                        <Text strong style={{ fontSize: 15, color: '#389e0d' }}>
                          {Number(product.b2bPrice).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                        </Text>
                      </div>
                    </div>
                  ) : (
                    <Tooltip title="Fiyatı görmek için üye olun">
                      <div
                        onClick={() => navigate(REGISTER_URL)}
                        style={{
                          background: 'linear-gradient(135deg, #1a1a2e, #0f3460)',
                          borderRadius: 8, padding: '10px 12px', marginBottom: 12,
                          cursor: 'pointer', border: '1px dashed #d4a017',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                        }}
                      >
                        <EyeInvisibleOutlined style={{ color: '#d4a017' }} />
                        <Text style={{ color: '#d4a017', fontSize: 12, fontWeight: 600 }}>
                          Fiyatı Gör → Üye Ol
                        </Text>
                      </div>
                    </Tooltip>
                  )}

                  {/* CTA */}
                  {isAuth ? (
                    <Button
                      type="primary"
                      block
                      size="small"
                      style={{ background: '#d4a017', borderColor: '#d4a017', borderRadius: 6 }}
                      onClick={() => navigate('/b2b/market')}
                    >
                      B2B Pazarında Gör
                    </Button>
                  ) : (
                    <Button
                      block
                      size="small"
                      icon={<UserAddOutlined />}
                      onClick={() => navigate(REGISTER_URL)}
                      style={{ borderRadius: 6 }}
                    >
                      Üye Ol & Talep Gönder
                    </Button>
                  )}
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div style={{ textAlign: 'center', marginTop: 40, display: 'flex', justifyContent: 'center', gap: 8 }}>
          {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(p => (
            <Button
              key={p}
              type={p === pagination.page ? 'primary' : 'default'}
              size="small"
              onClick={() => loadMore(p)}
              style={p === pagination.page ? { background: '#d4a017', borderColor: '#d4a017' } : {}}
            >
              {p}
            </Button>
          ))}
        </div>
      )}

      {/* Footer CTA for unauthenticated */}
      {!isAuth && products.length > 0 && (
        <div style={{
          marginTop: 48,
          background: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)',
          borderRadius: 16, padding: '40px 32px', textAlign: 'center'
        }}>
          <Title level={3} style={{ color: '#fff', marginBottom: 8 }}>
            Bu mağazanın ürünleri ile ilgileniyor musunuz?
          </Title>
          <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 15, display: 'block', marginBottom: 24 }}>
            Ücretsiz satıcı hesabı açın, fiyatları görün ve B2B listeleme talebi gönderin.
          </Text>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              type="primary"
              size="large"
              icon={<UserAddOutlined />}
              onClick={() => navigate(REGISTER_URL)}
              style={{ background: '#d4a017', borderColor: '#d4a017', height: 44, paddingInline: 28, fontSize: 15 }}
            >
              Ücretsiz Kayıt Ol
            </Button>
            <Button
              size="large"
              ghost
              onClick={() => navigate(LOGIN_URL)}
              style={{ height: 44, paddingInline: 28, fontSize: 15, color: '#fff', borderColor: 'rgba(255,255,255,0.5)' }}
            >
              Zaten Üyeyim
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreStorefront;
