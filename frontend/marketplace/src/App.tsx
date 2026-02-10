import React, { useState } from 'react';
import { Layout, Menu, Card, Input, Row, Col, Button, Pagination, Badge } from 'antd';
import {
  HomeOutlined,
  ShoppingOutlined,
  ShoppingCartOutlined,
  HeartOutlined,
  UserOutlined,
  LogoutOutlined,
  SearchOutlined
} from '@ant-design/icons';
import './App.css';

const { Header, Sider, Content, Footer } = Layout;

function App() {
  const [collapsed, setCollapsed] = useState(false);
  const [selectedKey, setSelectedKey] = useState('home');
  const [cartCount, setCartCount] = useState(3);

  const menuItems = [
    { key: 'home', icon: <HomeOutlined />, label: 'Anasayfa' },
    { key: 'products', icon: <ShoppingOutlined />, label: 'Ürünler' },
    { key: 'sellers', icon: <UserOutlined />, label: 'Satıcılar' }
  ];

  const products = [
    { id: 1, name: 'Altın Yüzük', price: 1500, rating: 4.5, seller: 'Ali Kuyumcu' },
    { id: 2, name: 'Gümüş Bilezik', price: 800, rating: 4.8, seller: 'Ayşe Aksesuar' },
    { id: 3, name: 'Elmas Kolye', price: 5000, rating: 5, seller: 'Gezer Jewels' },
    { id: 4, name: 'Altın Zincir', price: 2000, rating: 4.6, seller: 'Kuyumcu Plus' },
    { id: 5, name: 'Türkuaz Taşlı Yüzük', price: 900, rating: 4.3, seller: 'Doğal Taş' },
    { id: 6, name: 'Antika Broş', price: 1200, rating: 4.9, seller: 'Eski Eser' }
  ];

  const renderContent = () => {
    switch (selectedKey) {
      case 'home':
        return (
          <div>
            <Card style={{ marginBottom: 24, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: '#fff' }}>
              <h1>Golden Marketplace'e Hoş Geldiniz</h1>
              <p>Binlerce kaliteli ürün arasından seçim yapın</p>
            </Card>

            <div style={{ marginBottom: 24 }}>
              <Input.Search
                placeholder="Ürün ara..."
                enterButton={<SearchOutlined />}
                size="large"
                style={{ maxWidth: 500 }}
              />
            </div>

            <h2>Öne Çıkan Ürünler</h2>
            <Row gutter={[16, 16]}>
              {products.map((product) => (
                <Col key={product.id} xs={24} sm={12} lg={8}>
                  <Card
                    hoverable
                    cover={
                      <div
                        style={{
                          height: 200,
                          background: '#f0f0f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 48
                        }}
                      >
                        ✨
                      </div>
                    }
                  >
                    <Card.Meta
                      title={product.name}
                      description={
                        <div>
                          <p>
                            <strong>{product.price}₺</strong>
                          </p>
                          <p>⭐ {product.rating} | {product.seller}</p>
                        </div>
                      }
                    />
                    <Button type="primary" block style={{ marginTop: 16 }}>
                      Sepete Ekle
                    </Button>
                  </Card>
                </Col>
              ))}
            </Row>

            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <Pagination defaultCurrent={1} total={150} pageSize={6} />
            </div>
          </div>
        );

      case 'products':
        return (
          <Card>
            <h2>Tüm Ürünler</h2>
            <Row gutter={[16, 16]}>
              {products.map((product) => (
                <Col key={product.id} xs={24} sm={12} lg={8}>
                  <Card hoverable>
                    <div
                      style={{
                        height: 150,
                        background: '#f5f5f5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 16,
                        fontSize: 40
                      }}
                    >
                      ✨
                    </div>
                    <Card.Meta
                      title={product.name}
                      description={`${product.price}₺ - ${product.seller}`}
                    />
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>
        );

      case 'sellers':
        return (
          <Card>
            <h2>Satıcılar</h2>
            <p>Satıcı profilleri burada gösterilir...</p>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          background: '#001529',
          padding: '0 24px',
          color: '#fff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <h1 style={{ color: '#fff', margin: 0 }}>✨ Golden Marketplace</h1>
        <div>
          <Button type="primary" style={{ marginRight: 16 }} icon={<ShoppingCartOutlined />}>
            Sepet <Badge count={cartCount} />
          </Button>
          <Button type="primary" ghost icon={<UserOutlined />}>
            Giriş Yap
          </Button>
        </div>
      </Header>

      <Layout style={{ minHeight: 'calc(100vh - 64px)' }}>
        <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}>
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[selectedKey]}
            onClick={(e) => setSelectedKey(e.key)}
            items={menuItems}
          />
        </Sider>

        <Content style={{ margin: '24px 16px', padding: 24, background: '#f0f2f5', borderRadius: 8 }}>
          {renderContent()}
        </Content>
      </Layout>

      <Footer style={{ textAlign: 'center', background: '#001529', color: '#fff' }}>
        <p>&copy; 2026 Golden Marketplace - Tüm hakları saklıdır</p>
      </Footer>
    </Layout>
  );
}

export default App;
