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

  import { getProducts, Product } from './api/product';
  import { getGoldPrice, GoldPriceData } from './api/gold';

  // ...
  const [products, setProducts] = useState<Product[]>([]);
  const [goldPrice, setGoldPrice] = useState<GoldPriceData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [prodData, goldData] = await Promise.all([
          getProducts(),
          getGoldPrice()
        ]);
        setProducts(prodData || []);
        setGoldPrice(goldData);
      } catch (error) {
        console.error('Failed to fetch data', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

// ... in Header
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <h1 style={{ color: '#fff', margin: 0 }}>✨ Golden</h1>
            {goldPrice && (
                <div style={{ background: '#d4af37', padding: '4px 12px', borderRadius: '4px', color: '#000', fontWeight: 'bold' }}>
                    💛 Altın: {Math.round(goldPrice.price).toLocaleString('tr-TR')} {goldPrice.currency}/oz 
                    <span style={{ fontSize: '0.8em', marginLeft: '5px' }}>
                        ({goldPrice.change24h > 0 ? '+' : ''}{goldPrice.change24h}%)
                    </span>
                </div>
            )}
        </div>
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
    </Layout >
  );
}

export default App;
