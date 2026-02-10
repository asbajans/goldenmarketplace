import React, { useState } from 'react';
import { Layout, Menu, Card, Statistic, Row, Col, Button, Modal, Form, Input } from 'antd';
import {
  DashboardOutlined,
  ShoppingOutlined,
  LinkOutlined,
  CreditCardOutlined,
  SettingOutlined,
  LogoutOutlined,
  PlusOutlined
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
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  const menuItems: MenuItem[] = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard'
    },
    {
      key: 'products',
      icon: <ShoppingOutlined />,
      label: 'Ürünlerim'
    },
    {
      key: 'integrations',
      icon: <LinkOutlined />,
      label: 'Entegrasyonlar'
    },
    {
      key: 'subscriptions',
      icon: <CreditCardOutlined />,
      label: 'Abonelikler'
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Ayarlar'
    }
  ];

  const handleAddProduct = () => {
    setIsModalVisible(true);
  };

  const handleModalOk = () => {
    form.validateFields().then(() => {
      setIsModalVisible(false);
      form.resetFields();
    });
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const renderContent = () => {
    switch (selectedKey) {
      case 'dashboard':
        return (
          <div>
            <h1>Dashboard</h1>
            <Row gutter={16}>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic title="Toplam Ürün" value={245} />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic title="Toplam Satış" value={15420} suffix="₺" />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic title="Aktif Entegrasyon" value={5} />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic title="Mağaza Puanı" value={4.8} suffix="/5" />
                </Card>
              </Col>
            </Row>
          </div>
        );

      case 'products':
        return (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAddProduct}>
                Yeni Ürün Ekle
              </Button>
            </div>
            <Card>
              <h2>Ürünlerim</h2>
              <p>Ürün listesi burada görünecektir...</p>
            </Card>
          </div>
        );

      case 'integrations':
        return (
          <Card>
            <h2>Pazaryeri Entegrasyonları</h2>
            <Row gutter={16}>
              {['Etsy', 'Amazon', 'Hepsiburada', 'Trendyol', 'N11'].map((marketplace) => (
                <Col key={marketplace} xs={24} sm={12} lg={8}>
                  <Card style={{ marginBottom: 16 }}>
                    <h3>{marketplace}</h3>
                    <Button type="default">Bağlan</Button>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>
        );

      case 'subscriptions':
        return (
          <Card>
            <h2>Abonelikler</h2>
            <p>Aktif abonelikleriniz burada gösterilir...</p>
          </Card>
        );

      case 'settings':
        return (
          <Card>
            <h2>Ayarlar</h2>
            <p>Mağaza ayarlarınız burada bulunur...</p>
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
          <h2 style={{ margin: 0 }}>Satıcı Paneli</h2>
          <Button icon={<LogoutOutlined />}>Çıkış Yap</Button>
        </Header>

        <Content style={{ margin: '24px 16px', padding: 24, background: '#f0f2f5', borderRadius: 8 }}>
          {renderContent()}
        </Content>
      </Layout>

      <Modal title="Yeni Ürün Ekle" open={isModalVisible} onOk={handleModalOk} onCancel={handleModalCancel}>
        <Form form={form} layout="vertical">
          <Form.Item label="Ürün Adı" name="title" rules={[{ required: true, message: 'Ürün adı gerekli' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Kategori" name="category" rules={[{ required: true, message: 'Kategori gerekli' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Fiyat (₺)" name="basePrice" rules={[{ required: true, message: 'Fiyat gerekli' }]}>
            <Input type="number" />
          </Form.Item>
          <Form.Item label="Miktar" name="quantity" rules={[{ required: true, message: 'Miktar gerekli' }]}>
            <Input type="number" />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}

export default App;
