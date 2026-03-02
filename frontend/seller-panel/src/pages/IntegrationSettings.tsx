
import { useEffect, useState } from 'react';
import { Card, Button, Tag, message, Typography, Row, Col, Spin, Modal, Form, Input } from 'antd';
import { ShopOutlined, CheckCircleOutlined, SyncOutlined, DisconnectOutlined } from '@ant-design/icons';
import client from '../api/client';
import { useSearchParams } from 'react-router-dom';

const { Title, Text } = Typography;

interface Integration {
    id: string;
    platform: string;
    isActive: boolean;
    lastSyncAt: string;
    shopId?: string;
}

const platforms = [
    { key: 'etsy', name: 'Etsy', color: '#F56400', icon: <ShopOutlined /> },
    { key: 'amazon', name: 'Amazon', color: '#FF9900', icon: <ShopOutlined /> },
    { key: 'trendyol', name: 'Trendyol', color: '#F27A1A', icon: <ShopOutlined /> },
    { key: 'hepsiburada', name: 'Hepsiburada', color: '#FF6000', icon: <ShopOutlined /> },
    { key: 'n11', name: 'N11', color: '#5333ED', icon: <ShopOutlined /> },
];

const IntegrationSettings: React.FC = () => {
    const [integrations, setIntegrations] = useState<Integration[]>([]);
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState<string | null>(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
    const [form] = Form.useForm();
    const [searchParams] = useSearchParams();

    useEffect(() => {
        fetchIntegrations();

        // Handle URL params for notifications
        const status = searchParams.get('status');
        const platform = searchParams.get('platform');

        if (status === 'success' && platform) {
            message.success(`${platform} bağlantısı başarıyla sağlandı!`);
        } else if (status === 'error') {
            message.error('Bağlantı sırasında bir hata oluştu.');
        }
    }, [searchParams]);

    const fetchIntegrations = async () => {
        try {
            const { data } = await client.get('/integrations');
            setIntegrations(data);
        } catch (error) {
            console.error('Failed to fetch integrations', error);
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = async (platform: string) => {
        if (platform === 'etsy') {
            setConnecting(platform);
            try {
                const { data } = await client.get('/integrations/etsy/auth-url');
                window.location.href = data.url;
            } catch (error) {
                message.error('Bağlantı başlatılamadı');
                setConnecting(null);
            }
        } else {
            // Open modal for API key based integrations
            setSelectedPlatform(platform);
            setIsModalVisible(true);
            form.resetFields();
        }
    };

    const handleSaveApiKeys = async (values: any) => {
        if (!selectedPlatform) return;
        setConnecting(selectedPlatform);
        try {
            await client.post('/integrations/connect', {
                platform: selectedPlatform,
                ...values
            });
            message.success(`${selectedPlatform.toUpperCase()} başarıyla bağlandı!`);
            setIsModalVisible(false);
            fetchIntegrations();
        } catch (error) {
            message.error('Bağlantı kaydedilemedi.');
        } finally {
            setConnecting(null);
        }
    };

    const handleDisconnect = async (platform: string) => {
        try {
            await client.delete(`/integrations/${platform}`);
            message.success('Bağlantı kesildi');
            fetchIntegrations();
        } catch (error) {
            message.error('Bağlantı kesilemedi');
        }
    };

    const handleTestConnection = async (platform: string) => {
        setConnecting(platform + '-test');
        try {
            const { data } = await client.get(`/integrations/test/${platform}`);
            if (data.success) {
                message.success('Bağlantı başarılı: ' + data.result?.message);
            } else {
                message.warning('Test başarısız: ' + data.result?.message);
            }
        } catch (error: any) {
            message.error(error.response?.data?.error || 'Bağlantı testi sırasında hata oluştu.');
        } finally {
            setConnecting(null);
        }
    };

    const getIntegrationStatus = (platformKey: string) => {
        return integrations.find(i => i.platform === platformKey);
    };

    return (
        <div style={{ padding: 24 }}>
            <Title level={2}>Pazaryeri Entegrasyonları</Title>
            <Text type="secondary">Mağazanızı diğer pazaryerlerine bağlayın ve ürünlerinizi tek yerden yönetin.</Text>

            <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
                {platforms.map(platform => {
                    const integration = getIntegrationStatus(platform.key);
                    const isConnected = !!integration;

                    return (
                        <Col xs={24} sm={12} lg={8} key={platform.key}>
                            <Card
                                actions={[
                                    isConnected ? (
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <Button type="default" size="small" onClick={() => handleTestConnection(platform.key)} loading={connecting === platform.key + '-test'}>
                                                Test Et
                                            </Button>
                                            <Button danger type="text" size="small" icon={<DisconnectOutlined />} onClick={() => handleDisconnect(platform.key)}>
                                                Kes
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button
                                            type="primary"
                                            icon={<SyncOutlined spin={connecting === platform.key} />}
                                            onClick={() => handleConnect(platform.key)}
                                            loading={connecting === platform.key}
                                        >
                                            Bağla
                                        </Button>
                                    )
                                ]}
                            >
                                <Card.Meta
                                    avatar={
                                        <div style={{
                                            backgroundColor: platform.color,
                                            width: 40, height: 40,
                                            borderRadius: 8,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: '#fff', fontSize: 20
                                        }}>
                                            {platform.icon}
                                        </div>
                                    }
                                    title={
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            {platform.name}
                                            {isConnected && <Tag color="success" icon={<CheckCircleOutlined />}>Aktif</Tag>}
                                        </div>
                                    }
                                    description={isConnected
                                        ? `Son senkronizasyon: ${new Date(integration.lastSyncAt).toLocaleDateString()}`
                                        : "Bağlantı yok"
                                    }
                                />
                            </Card>
                        </Col>
                    );
                })}
            </Row>

            {loading && (
                <div style={{ textAlign: 'center', marginTop: 40 }}>
                    <Spin size="large" />
                </div>
            )}

            <Modal
                title={`${platforms.find(p => p.key === selectedPlatform)?.name} API Bilgileri`}
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                footer={null}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSaveApiKeys}
                >
                    <Form.Item
                        name="apiKey"
                        label="API Key (veya Client ID)"
                        rules={[{ required: true, message: 'Lütfen API Key girin' }]}
                    >
                        <Input placeholder="API Anahtarı" />
                    </Form.Item>

                    <Form.Item
                        name="apiSecret"
                        label="API Secret (veya Password)"
                        rules={[{ required: true, message: 'Lütfen API Secret girin' }]}
                    >
                        <Input.Password placeholder="API Şifresi" />
                    </Form.Item>

                    <Form.Item
                        name="shopId"
                        label="Satıcı/Mağaza ID (Opsiyonel)"
                    >
                        <Input placeholder="Eğer platform gerektiriyorsa (örn: Trendyol Satıcı ID)" />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={connecting === selectedPlatform} block>
                            Bağla ve Kaydet
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default IntegrationSettings;
