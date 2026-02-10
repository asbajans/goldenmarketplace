import React, { useState } from 'react';
import { Layout, Menu, Card, Statistic, Row, Col, Button, Table, Space } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  ShoppingOutlined,
  CreditCardOutlined,
  SettingOutlined,
  LogoutOutlined,
  DeleteOutlined,
  EditOutlined
} from '@ant-design/icons';
import './App.css';

const { Header, Sider, Content } = Layout;

interface MenuItem {
  key: string;
  icon: React.ReactNode;
  label: string;
}

function App() {
  const [collapsed, setCollapsed] = useState(false);
  const [selectedKey, setSelectedKey] = useState('dashboard');

  const menuItems: MenuItem[] = [
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
      key: 'subscriptions',
      icon: <CreditCardOutlined />,
      label: 'Abonelikler'
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Sistem Ayarları'
    }
  ];

  const userColumns = [
    { title: 'E-posta', dataIndex: 'email', key: 'email' },
    { title: 'Ad Soyad', dataIndex: 'name', key: 'name' },
    { title: 'Tip', dataIndex: 'type', key: 'type' },
    { title: 'Durum', dataIndex: 'status', key: 'status' },
    {
      title: 'İşlemler',
      key: 'actions',
      render: () => (
        <Space>
          <Button icon={<EditOutlined />} type="link" />
          <Button icon={<DeleteOutlined />} type="link" danger />
        </Space>
      )
    }
  ];

  const userData = [
    { key: 1, email: 'seller1@example.com', name: 'Ali Yılmaz', type: 'Satıcı', status: 'Aktif' },
    { key: 2, email: 'seller2@example.com', name: 'Ayşe Kaya', type: 'Satıcı', status: 'Aktif' },
    { key: 3, email: 'customer@example.com', name: 'Müşteri 1', type: 'Müşteri', status: 'Pasif' }
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
        return (
          <Card>
            <h2>Kullanıcı Yönetimi</h2>
            <Table dataSource={userData} columns={userColumns} pagination={{ pageSize: 10 }} />
          </Card>
        );

      case 'sellers':
        return (
          <Card>
            <h2>Satıcı Yönetimi</h2>
            <p>Satıcı listesi burada gösterilir...</p>
          </Card>
        );

      case 'subscriptions':
        return (
          <Card>
            <h2>Abonelik Yönetimi</h2>
            <p>Abonelik listesi burada gösterilir...</p>
          </Card>
        );

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
