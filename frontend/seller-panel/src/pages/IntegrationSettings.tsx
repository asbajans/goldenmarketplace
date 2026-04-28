
import { useEffect, useState } from 'react';
import { Card, Button, Tag, message, Typography, Row, Col, Spin, Modal, Form, Input, InputNumber, Divider, Tooltip } from 'antd';
import { ShopOutlined, CheckCircleOutlined, SyncOutlined, DisconnectOutlined, InfoCircleOutlined } from '@ant-design/icons';
import client from '../api/client';
import { useSearchParams } from 'react-router-dom';

const { Title, Text } = Typography;

interface Integration {
    id: string;
    platform: string;
    isActive: boolean;
    lastSyncAt: string;
    lastSyncStatus?: 'success' | 'error';
    lastSyncMessage?: string;
    shopId?: string;
}

const platforms = [
    { key: 'etsy', name: 'Etsy', color: '#F56400', icon: <ShopOutlined /> },
    { key: 'trendyol', name: 'Trendyol', color: '#F27A1A', icon: <ShopOutlined /> },
    { key: 'hepsiburada', name: 'Hepsiburada', color: '#FF6000', icon: <ShopOutlined /> },
    { key: 'n11', name: 'N11', color: '#5333ED', icon: <ShopOutlined /> },
    { key: 'pazarama', name: 'Pazarama', color: '#E4002B', icon: <ShopOutlined /> },
    { key: 'amazon', name: 'Amazon', color: '#FF9900', icon: <ShopOutlined /> },
];

const platformConfig: Record<string, {
    apiKeyLabel: string;
    apiSecretLabel: string;
    shopIdLabel?: string;
    shopIdRequired?: boolean;
    helpUrl: string;
    extraFields?: 'trendyol' | 'n11' | 'pazarama';
}> = {
    trendyol: {
        apiKeyLabel: 'API Key (Trendyol Entegrasyon Paneli)',
        apiSecretLabel: 'API Secret',
        shopIdLabel: 'Satıcı ID (Supplier ID)',
        shopIdRequired: true,
        helpUrl: 'https://entegrasyon.trendyol.com',
        extraFields: 'trendyol'
    },
    hepsiburada: {
        apiKeyLabel: 'Kullanıcı Adı (Username)',
        apiSecretLabel: 'Şifre (Password)',
        shopIdLabel: 'Merchant ID',
        shopIdRequired: true,
        helpUrl: 'https://merchant.hepsiburada.com'
    },
    n11: {
        apiKeyLabel: 'App Key',
        apiSecretLabel: 'App Secret',
        helpUrl: 'https://apiportal.n11.com',
        extraFields: 'n11'
    },
    pazarama: {
        apiKeyLabel: 'Client ID',
        apiSecretLabel: 'Client Secret',
        helpUrl: 'https://isortagim.pazarama.com/auth/integration',
        extraFields: 'pazarama'
    },
    amazon: {
        apiKeyLabel: 'LWA Client ID',
        apiSecretLabel: 'LWA Client Secret',
        shopIdLabel: 'Seller ID',
        shopIdRequired: false,
        helpUrl: 'https://sellercentral.amazon.com.tr'
    }
};

const IntegrationSettings: React.FC = () => {
    const [integrations, setIntegrations] = useState<Integration[]>([]);
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState<string | null>(null);
    const [syncingOrders, setSyncingOrders] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isEtsyModalVisible, setIsEtsyModalVisible] = useState(false);
    const [etsyForm] = Form.useForm();
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
            setIntegrations(Array.isArray(data) ? data : ((data as any)?.data || []));
        } catch (error) {
            console.error('Failed to fetch integrations', error);
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = async (platform: string) => {
        if (platform === 'etsy') {
            setIsEtsyModalVisible(true);
            etsyForm.resetFields();
        } else {
            // Open modal for API key based integrations
            setSelectedPlatform(platform);
            setIsModalVisible(true);
            form.resetFields();
        }
    };

    const handleEtsyConnect = async (values: any) => {
        setConnecting('etsy');
        try {
            const categoryId = values.etsyCategoryId ? `?categoryId=${values.etsyCategoryId}` : '';
            const { data } = await client.get(`/integrations/etsy/auth-url${categoryId}`);
            window.location.href = data.url;
        } catch (error) {
            message.error('Bağlantı başlatılamadı');
            setConnecting(null);
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

    const handleSyncEtsyOrders = async () => {
        setSyncingOrders(true);
        try {
            const { data } = await client.post('/integrations/etsy/orders/sync', {});
            message.success(`Senkronizasyon tamamlandı: ${data.imported} sipariş içe aktarıldı, ${data.skipped} atlandı.`);
        } catch (error: any) {
            message.error(error.response?.data?.error || 'Sipariş senkronizasyonu başarısız');
        } finally {
            setSyncingOrders(false);
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
                                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                                            {platform.key === 'etsy' && (
                                                <Button
                                                    type="primary"
                                                    size="small"
                                                    icon={<SyncOutlined spin={syncingOrders} />}
                                                    onClick={handleSyncEtsyOrders}
                                                    loading={syncingOrders}
                                                >
                                                    Siparişleri Çek
                                                </Button>
                                            )}
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
                                        ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                                    Son senkronizasyon: {integration.lastSyncAt ? new Date(integration.lastSyncAt).toLocaleString('tr-TR') : 'Hiç çalışmadı'}
                                                    {integration.lastSyncStatus === 'success' && <CheckCircleOutlined style={{ color: '#52c41a', marginLeft: 6 }} />}
                                                </Text>
                                                {integration.lastSyncStatus === 'error' && (
                                                    <Text type="danger" style={{ fontSize: '12px', whiteSpace: 'pre-wrap', maxHeight: '100px', overflowY: 'auto', backgroundColor: '#fff1f0', padding: '4px 8px', borderRadius: 4, border: '1px solid #ffccc7' }}>
                                                        <strong>Hata:</strong> {integration.lastSyncMessage || 'Bilinmeyen bir hata oluştu.'}
                                                    </Text>
                                                )}
                                            </div>
                                        )
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
                title={`${platforms.find(p => p.key === selectedPlatform)?.name} Entegrasyonu`}
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                footer={null}
            >
                {selectedPlatform && platformConfig[selectedPlatform] && (
                    <>
                        <p style={{ marginBottom: 16, color: '#888' }}>
                            API bilgilerinizi{' '}
                            <a href={platformConfig[selectedPlatform].helpUrl} target="_blank" rel="noreferrer">
                                {platforms.find(p => p.key === selectedPlatform)?.name} Satıcı Paneli
                            </a>'nden alabilirsiniz.
                        </p>
                        <Form form={form} layout="vertical" onFinish={handleSaveApiKeys}>
                            <Form.Item
                                name="apiKey"
                                label={platformConfig[selectedPlatform].apiKeyLabel}
                                rules={[{ required: true, message: 'Zorunlu alan' }]}
                            >
                                <Input />
                            </Form.Item>

                            <Form.Item
                                name="apiSecret"
                                label={platformConfig[selectedPlatform].apiSecretLabel}
                                rules={[{ required: true, message: 'Zorunlu alan' }]}
                            >
                                <Input.Password />
                            </Form.Item>

                            {platformConfig[selectedPlatform].shopIdLabel && (
                                <Form.Item
                                    name="shopId"
                                    label={platformConfig[selectedPlatform].shopIdLabel}
                                    rules={platformConfig[selectedPlatform].shopIdRequired
                                        ? [{ required: true, message: 'Zorunlu alan' }]
                                        : []
                                    }
                                >
                                    <Input />
                                </Form.Item>
                            )}

                            {/* Trendyol product creation config */}
                            {platformConfig[selectedPlatform].extraFields === 'trendyol' && (
                                <>
                                    <Divider orientation="left" style={{ fontSize: 13 }}>
                                        Ürün Oluşturma Ayarları
                                    </Divider>
                                    <p style={{ color: '#888', fontSize: 12, marginBottom: 12 }}>
                                        Trendyol'da yeni ürün oluşturmak için kategori ve marka ID gereklidir.
                                        Bu bilgileri Trendyol Satıcı Paneli &gt; Katalog &gt; Markalar/Kategoriler bölümünden bulabilirsiniz.
                                    </p>
                                    <Row gutter={12}>
                                        <Col span={12}>
                                            <Form.Item
                                                name="trendyolCategoryId"
                                                label={
                                                    <span>Kategori ID{' '}
                                                        <Tooltip title="Trendyol kategori ID (sayısal). Örn: 411 (Takı)">
                                                            <InfoCircleOutlined style={{ color: '#888' }} />
                                                        </Tooltip>
                                                    </span>
                                                }
                                            >
                                                <InputNumber style={{ width: '100%' }} placeholder="örn: 411" />
                                            </Form.Item>
                                        </Col>
                                        <Col span={12}>
                                            <Form.Item
                                                name="trendyolBrandId"
                                                label={
                                                    <span>Marka ID{' '}
                                                        <Tooltip title="Trendyol marka ID (sayısal). Örn: 102 (Markasız)">
                                                            <InfoCircleOutlined style={{ color: '#888' }} />
                                                        </Tooltip>
                                                    </span>
                                                }
                                            >
                                                <InputNumber style={{ width: '100%' }} placeholder="örn: 102" />
                                            </Form.Item>
                                        </Col>
                                    </Row>
                                    <Form.Item name="defaultVatRate" label="KDV Oranı (%)">
                                        <InputNumber min={1} max={20} defaultValue={10} style={{ width: 100 }} addonAfter="%" />
                                    </Form.Item>
                                </>
                            )}

                            {/* N11 product creation config */}
                            {platformConfig[selectedPlatform].extraFields === 'n11' && (
                                <>
                                    <Divider orientation="left" style={{ fontSize: 13 }}>
                                        Ürün Oluşturma Ayarları
                                    </Divider>
                                    <Form.Item
                                        name="n11CategoryId"
                                        label={
                                            <span>N11 Kategori ID{' '}
                                                <Tooltip title="N11 kategori kodu. N11 Satıcı Paneli &gt; Ürünler &gt; Kategori seçiminden bulabilirsiniz.">
                                                    <InfoCircleOutlined style={{ color: '#888' }} />
                                                </Tooltip>
                                            </span>
                                        }
                                    >
                                        <Input placeholder="örn: 1006890" />
                                    </Form.Item>
                                    <Form.Item name="defaultVatRate" label="KDV Oranı (%)">
                                        <InputNumber min={1} max={20} defaultValue={10} style={{ width: 100 }} addonAfter="%" />
                                    </Form.Item>
                                </>
                            )}

                            {/* Pazarama product creation config */}
                            {platformConfig[selectedPlatform].extraFields === 'pazarama' && (
                                <>
                                    <Divider orientation="left" style={{ fontSize: 13 }}>
                                        Ürün Oluşturma Ayarları
                                    </Divider>
                                    <p style={{ color: '#888', fontSize: 12, marginBottom: 12 }}>
                                        Pazarama'da yeni ürün oluşturmak için kategori ve marka ID gereklidir (Alfasayısal veya Sayısal).
                                    </p>
                                    <Row gutter={12}>
                                        <Col span={12}>
                                            <Form.Item
                                                name="pazaramaCategoryId"
                                                label={
                                                    <span>Kategori ID{' '}
                                                        <Tooltip title="Pazarama kategori ID. Entegre paneli / Kategori listesinden bulabilirsiniz.">
                                                            <InfoCircleOutlined style={{ color: '#888' }} />
                                                        </Tooltip>
                                                    </span>
                                                }
                                            >
                                                <Input style={{ width: '100%' }} placeholder="örn: CATEGORY-1" />
                                            </Form.Item>
                                        </Col>
                                        <Col span={12}>
                                            <Form.Item
                                                name="pazaramaBrandId"
                                                label={
                                                    <span>Marka ID{' '}
                                                        <Tooltip title="Pazarama marka ID. Entegre paneli / Marka listesinden bulabilirsiniz.">
                                                            <InfoCircleOutlined style={{ color: '#888' }} />
                                                        </Tooltip>
                                                    </span>
                                                }
                                            >
                                                <Input style={{ width: '100%' }} placeholder="örn: BRAND-1" />
                                            </Form.Item>
                                        </Col>
                                    </Row>
                                    <Form.Item name="defaultVatRate" label="KDV Oranı (%)">
                                        <InputNumber min={1} max={20} defaultValue={10} style={{ width: 100 }} addonAfter="%" />
                                    </Form.Item>
                                </>
                            )}

                            <Form.Item>
                                <Button type="primary" htmlType="submit" loading={connecting === selectedPlatform} block>
                                    Bağla ve Kaydet
                                </Button>
                            </Form.Item>
                        </Form>
                    </>
                )}
            </Modal>

            {/* Etsy Explicit Modal */}
            <Modal
                title="Etsy Entegrasyonu"
                open={isEtsyModalVisible}
                onCancel={() => setIsEtsyModalVisible(false)}
                footer={null}
            >
                <p style={{ marginBottom: 16, color: '#888' }}>
                    Etsy'de ürünlerinizi listeleyebilmemiz için varsayılan bir Taxonomy ID (Kategori ID) girebilirsiniz.
                    Bu değer ürün eklerken değiştirilebilir. Örneğin, Takı için "1153" girebilirsiniz (Opsiyonel).
                </p>
                <Form form={etsyForm} layout="vertical" onFinish={handleEtsyConnect}>
                    <Form.Item
                        name="etsyCategoryId"
                        label="Etsy Taxonomy ID (Varsayılan)"
                        rules={[]}
                    >
                        <InputNumber style={{ width: '100%' }} placeholder="örn: 1153 (Opsiyonel)" />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={connecting === 'etsy'} block>
                            Etsy'ye Yönlendir
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default IntegrationSettings;
