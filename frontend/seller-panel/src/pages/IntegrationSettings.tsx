
import { useEffect, useState } from 'react';
import { Card, Button, Tag, message, Typography, Row, Col, Spin } from 'antd';
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
        setConnecting(platform);
        try {
            if (platform === 'etsy') {
                const { data } = await client.get('/integrations/etsy/auth-url');
                window.location.href = data.url;
            } else {
                message.info(`${platform} entegrasyonu yakında gelecek!`);
            }
        } catch (error) {
            message.error('Bağlantı başlatılamadı');
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
                                        <Button danger type="text" icon={<DisconnectOutlined />} onClick={() => handleDisconnect(platform.key)}>
                                            Bağlantıyı Kes
                                        </Button>
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
        </div>
    );
};

export default IntegrationSettings;
