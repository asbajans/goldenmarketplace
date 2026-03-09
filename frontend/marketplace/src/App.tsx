import { useState, useEffect } from 'react';
import { Layout, Menu, Button, Badge } from 'antd';
import {
  HomeOutlined,
  ShoppingOutlined,
  ShoppingCartOutlined,
  UserOutlined
} from '@ant-design/icons';
import { getProducts, Product } from './api/product';
import { getGoldPrice, GoldPriceData } from './api/gold';
import './App.css';

const { Header, Sider, Content, Footer } = Layout;

function App() {
  const [collapsed, setCollapsed] = useState(false);
  const [selectedKey, setSelectedKey] = useState('home');
  const [cartCount] = useState(3);
  const [products, setProducts] = useState<Product[]>([]);
  const [goldPrice, setGoldPrice] = useState<GoldPriceData | null>(null);
  const [loading, setLoading] = useState(false);

  const menuItems = [
    { key: 'home', icon: <HomeOutlined />, label: 'Anasayfa' },
    { key: 'products', icon: <ShoppingOutlined />, label: 'Ürünler' },
    { key: 'sellers', icon: <UserOutlined />, label: 'Satıcılar' }
  ];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [prodData, goldData] = await Promise.all([
          getProducts(),
          getGoldPrice()
        ]);
        setProducts(prodData?.data || []);
        setGoldPrice(goldData);
      } catch (error) {
        console.error('Failed to fetch data', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const renderContent = () => {
    if (loading) return <div>Yükleniyor...</div>;

    switch (selectedKey) {
      case 'home':
        return <div>Anasayfa İçeriği</div>;
      case 'products':
        return (
          <div>
            <h2>Tüm Ürünler ({products.length})</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px', marginTop: '20px' }}>
              {products.map(product => (
                <div key={product.id} style={{ background: '#fff', padding: '16px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                  <h3 style={{ margin: '0 0 10px 0' }}>{product.title}</h3>
                  <div style={{ color: '#d4af37', fontWeight: 'bold', fontSize: '18px', marginBottom: '10px' }}>
                    {product.priceTRY} ₺
                  </div>
                  <div style={{ color: '#888', fontSize: '12px' }}>
                    Stok: {product.quantity} | Kategori: {product.category}
                  </div>
                  <Button type="primary" block style={{ marginTop: '15px' }} icon={<ShoppingCartOutlined />}>
                    Sepete Ekle
                  </Button>
                </div>
              ))}
            </div>
          </div>
        );
      case 'sellers':
        return <div>Satıcılar İçeriği</div>;
      default:
        return <div>Sayfa Bulunamadı</div>;
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <h1 style={{ color: '#fff', margin: 0 }}>✨ Golden</h1>
          {goldPrice && (
            <div style={{ background: '#d4af37', padding: '4px 12px', borderRadius: '4px', color: '#000', fontWeight: 'bold' }}>
              💛 24K Gram: {Math.round(goldPrice.pricePerGramTRY).toLocaleString('tr-TR')} ₺
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

      <Layout>
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
