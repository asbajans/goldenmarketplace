
import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, message, Spin, theme } from 'antd';
import {
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  DashboardOutlined,
  ShoppingOutlined,
  PlusCircleOutlined,
  LogoutOutlined,
  CreditCardOutlined,
  CompassOutlined,
  FileTextOutlined,
  AppstoreOutlined,
  SyncOutlined,
  InboxOutlined,
  CarOutlined
} from '@ant-design/icons';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ProductList from './pages/ProductList';
import AddProduct from './pages/AddProduct';
import BulkUpload from './pages/BulkUpload';
import Subscription from './pages/Subscription';
import SubscriptionSuccess from './pages/SubscriptionSuccess';
import IntegrationSettings from './pages/IntegrationSettings';
import B2BMarket from './pages/B2BMarket';
import B2BRequests from './pages/B2BRequests';
import StoreStorefront from './pages/StoreStorefront';
import Variations from './pages/Variations';
import Orders from './pages/Orders';
import Shipments from './pages/Shipments';
import { getCurrentUser, logout } from './api/auth';

const { Header, Sider, Content } = Layout;

const App: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      await getCurrentUser();
      setIsAuthenticated(true);
    } catch (error) {
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    setIsAuthenticated(false);
    message.success('Çıkış yapıldı');
    navigate('/login');
  };

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: 'Panel',
      onClick: () => navigate('/dashboard')
    },
    {
      key: '/products',
      icon: <ShoppingOutlined />,
      label: 'Ürünler',
      onClick: () => navigate('/products')
    },
    {
      key: '/products/add',
      icon: <PlusCircleOutlined />,
      label: 'Ürün Ekle',
      onClick: () => navigate('/products/add')
    },
    {
      key: '/products/bulk',
      icon: <PlusCircleOutlined />,
      label: 'Toplu Yükleme',
      onClick: () => navigate('/products/bulk')
    },
    {
      key: '/variations',
      icon: <AppstoreOutlined />,
      label: 'Varyasyonlar',
      onClick: () => navigate('/variations')
    },
    {
      key: '/b2b/market',
      icon: <CompassOutlined />,
      label: 'B2B Ürün Keşfet',
      onClick: () => navigate('/b2b/market')
    },
    {
      key: '/b2b/requests',
      icon: <FileTextOutlined />,
      label: 'B2B Talepleri',
      onClick: () => navigate('/b2b/requests')
    },
    {
      key: '/integrations',
      icon: <SyncOutlined />,
      label: 'Entegrasyonlar',
      onClick: () => navigate('/integrations')
    },
    {
      key: '/orders',
      icon: <InboxOutlined />,
      label: 'Siparişler',
      onClick: () => navigate('/orders')
    },
    {
      key: '/shipments',
      icon: <CarOutlined />,
      label: 'Kargolar',
      onClick: () => navigate('/shipments')
    },
    {
      key: '/subscription',
      icon: <CreditCardOutlined />,
      label: 'Abonelik',
      onClick: () => navigate('/subscription')
    }
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login onLogin={() => setIsAuthenticated(true)} />} />
        <Route path="/register" element={<Register />} />
        {/* Public store page — accessible without auth */}
        <Route path="/store/:storeSlug" element={<StoreStorefront />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed}>
        <div className="demo-logo-vertical" style={{ height: 32, margin: 16, background: 'rgba(255, 255, 255, 0.2)' }} />
        <Menu
          theme="dark"
          mode="inline"
          defaultSelectedKeys={[location.pathname]}
          items={menuItems}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: 0, background: colorBgContainer, display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: 24 }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{
              fontSize: '16px',
              width: 64,
              height: 64,
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {(() => {
              try {
                const u = JSON.parse(localStorage.getItem('user') || 'null');
                if (u) {
                  return (
                    <div style={{ textAlign: 'right', lineHeight: '1.2', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <strong style={{ fontSize: '14px' }}>{u.store?.storeName || u.store?.name || 'Benim Mağazam'}</strong>
                      <span style={{ fontSize: '12px', color: '#888' }}>{u.firstName} {u.lastName}</span>
                    </div>
                  );
                }
              } catch (e) {}
              return null;
            })()}
            <Button icon={<LogoutOutlined />} onClick={handleLogout} danger>Çıkış Yap</Button>
          </div>
        </Header>
        <Content
          style={{
            margin: '24px 16px',
            padding: 24,
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
            overflow: 'auto'
          }}
        >
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/products" element={<ProductList />} />
            <Route path="/products/add" element={<AddProduct onSuccess={() => navigate('/products')} />} />
            <Route path="/products/bulk" element={<BulkUpload />} />
            <Route path="/products/edit/:id" element={<AddProduct onSuccess={() => navigate('/products')} />} />
            <Route path="/b2b/market" element={<B2BMarket />} />
            <Route path="/b2b/requests" element={<B2BRequests />} />
            <Route path="/variations" element={<Variations />} />
            {/* Public store page — accessible from shared links */}
            <Route path="/store/:storeSlug" element={<StoreStorefront />} />
            <Route path="/integrations" element={<IntegrationSettings />} />
            <Route path="/subscription" element={<Subscription />} />
            <Route path="/subscription/success" element={<SubscriptionSuccess />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/shipments" element={<Shipments />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
};

export default App;
