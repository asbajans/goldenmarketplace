import { useState } from 'react';
import { Layout, Menu, Card, Statistic, Row, Col, Button, type MenuProps } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  ShoppingOutlined,
  CreditCardOutlined,
  SettingOutlined,
  LogoutOutlined,
  AppstoreOutlined
} from '@ant-design/icons';
import './App.css';

import UsersPage from './pages/UsersPage';
import SellersPage from './pages/SellersPage';
import CategoriesPage from './pages/CategoriesPage';
import SubscriptionsPage from './pages/SubscriptionsPage';
import IntegrationsPage from './pages/IntegrationsPage';

const { Header, Sider, Content } = Layout;

function App() {
  const [collapsed, setCollapsed] = useState(false);
  const [selectedKey, setSelectedKey] = useState('dashboard');

  const menuItems: MenuProps['items'] = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard'
    },
    {
      key: 'users',
      icon: <UserOutlined />,
      label: 'Kullanıcılar'
    },
    {
      key: 'sellers',
      icon: <ShoppingOutlined />,
      label: 'Satıcılar'
    },
    {
      key: 'categories',
      icon: <AppstoreOutlined />,
      label: 'Kategoriler'
    },
    {
      key: 'subscriptions',
      icon: <CreditCardOutlined />,
      label: 'Abonelikler'
    },
    {
      key: 'integrations',
      icon: <SettingOutlined />,
      label: 'Entegrasyonlar'
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Sistem Ayarları'
    }
  ];



  const renderContent = () => {
    switch (selectedKey) {
      case 'dashboard':
        return (
          <div>
            <h1>Admin Dashboard</h1>
            <Row gutter={16}>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic title="Toplam Kullanıcı" value={1250} />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic title="Toplam Satıcı" value={450} />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic title="Aktif Abonelik" value={380} />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic title="Toplam Gelir" value={500000} suffix="₺" />
                </Card>
              </Col>
            </Row>
          </div>
        );

      case 'users':
        return <UsersPage />;

      case 'sellers':
        return <SellersPage />;

      case 'categories':
        return <CategoriesPage />;

      case 'subscriptions':
        return <SubscriptionsPage />;

      case 'integrations':
        return <IntegrationsPage />;

      case 'settings':
        return (
          <Card>
            <h2>Sistem Ayarları</h2>
            <p>Sistem konfigürasyonu burada yapılır...</p>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}>
        <div
          style={{
            height: 64,
            background: '#fff',
            margin: 16,
            borderRadius: 8,
            textAlign: 'center',
            lineHeight: '64px',
            fontWeight: 'bold',
            color: '#1890ff'
          }}
        >
          {!collapsed && 'Golden'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          onClick={(e) => setSelectedKey(e.key)}
          items={menuItems}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <h2 style={{ margin: 0 }}>Süper Admin Paneli</h2>
          <Button icon={<LogoutOutlined />}>Çıkış Yap</Button>
        </Header>

        <Content style={{ margin: '24px 16px', padding: 24, background: '#f0f2f5', borderRadius: 8 }}>
          {renderContent()}
        </Content>
      </Layout>
    </Layout>
  );
}

export default App;
