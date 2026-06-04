import { useEffect, useState } from 'react';
import { Card, Form, Input, Button, message, Divider, Spin, InputNumber, Alert, Statistic, Row, Col, Select, Space } from 'antd';
import { DollarOutlined, SyncOutlined, GoldOutlined, RobotOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { AdminAPI } from '../services/api';

interface GoldPriceInfo {
    pricePerGramTRY: number;
    usdTryRate?: number;
    source: string;
    timestamp: string;
}

export default function SettingsPage() {
    const [form] = Form.useForm();
    const [aiForm] = Form.useForm();
    const [goldForm] = Form.useForm();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savingGold, setSavingGold] = useState(false);
    const [savingAI, setSavingAI] = useState(false);
    const [testingAI, setTestingAI] = useState(false);
    const [aiTestResult, setAITestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [goldPrice, setGoldPrice] = useState<GoldPriceInfo | null>(null);
    const [syncResult, setSyncResult] = useState<string | null>(null);

    useEffect(() => {
        fetchSettings();
        fetchGoldPrice();
        fetchAISettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const data = await AdminAPI.getSettings();
            form.setFieldsValue(data);
            // Pre-fill gold price field if already set
            if (data.gold_price_try_per_gram) {
                goldForm.setFieldsValue({ pricePerGramTRY: parseFloat(data.gold_price_try_per_gram) });
            }
        } catch (error) {
            message.error('Ayarlar yüklenemedi.');
        } finally {
            setLoading(false);
        }
    };

    const fetchAISettings = async () => {
        try {
            const data = await AdminAPI.getAISettings();
            aiForm.setFieldsValue(data);
        } catch { /* noop */ }
    };

    const handleSaveAI = async (values: any) => {
        try {
            setSavingAI(true);
            await AdminAPI.updateAISettings(values);
            message.success('AI ayarları kaydedildi!');
        } catch (error: any) {
            message.error(error.response?.data?.error || 'AI ayarları kaydedilemedi.');
        } finally {
            setSavingAI(false);
        }
    };

    const handleTestAI = async () => {
        try {
            setTestingAI(true);
            setAITestResult(null);
            const values = aiForm.getFieldsValue();
            const res = await AdminAPI.testAIConnection(values);
            setAITestResult(res);
            if (res.success) message.success('Bağlantı başarılı!');
            else message.error(res.message);
        } catch (error: any) {
            setAITestResult({ success: false, message: error.message });
            message.error('Bağlantı testi başarısız.');
        } finally {
            setTestingAI(false);
        }
    };

    const fetchGoldPrice = async () => {
        try {
            const data = await AdminAPI.getGoldPrice();
            setGoldPrice(data);
            if (data.pricePerGramTRY) {
                goldForm.setFieldsValue({
                    pricePerGramTRY: data.pricePerGramTRY,
                    usdTryRate: data.usdTryRate || 38.5
                });
            }
        } catch (err) {
            // no-op
        }
    };

    const handleSaveGoldPrice = async (values: { pricePerGramTRY: number; usdTryRate: number }) => {
        try {
            setSavingGold(true);
            setSyncResult(null);
            const data = await AdminAPI.setGoldPrice(values.pricePerGramTRY, values.usdTryRate);
            message.success(data.message);
            setSyncResult(data.message);
            fetchGoldPrice();
        } catch (error: any) {
            message.error(error.response?.data?.error || error.message || 'Altın fiyatı kaydedilemedi.');
        } finally {
            setSavingGold(false);
        }
    };

    const handleSave = async (values: any) => {
        try {
            setSaving(true);
            await AdminAPI.updateSettings(values);
            message.success('Ayarlar başarıyla kaydedildi!');
        } catch (error) {
            message.error('Ayarlar kaydedilirken bir hata oluştu.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <Spin size="large" style={{ display: 'flex', justifyContent: 'center', marginTop: 100 }} />;
    }

    return (
        <div>
            {/* Gold Price Section */}
            <Card
                title={<><GoldOutlined style={{ color: '#f5a623', marginRight: 8 }} />Altın Fiyatı (Manuel)</>}
                bordered={false}
                style={{ marginBottom: 24 }}
            >
                <Alert
                    type="info"
                    showIcon
                    style={{ marginBottom: 20 }}
                    message="Altın fiyatı manuel olarak girilir. Fiyat kaydedildiğinde tüm ürün fiyatları anında güncellenir ve pazaryerleri (Trendyol, N11 vb.) otomatik senkronize edilir."
                />

                {goldPrice && (
                    <Row gutter={16} style={{ marginBottom: 24 }}>
                        <Col>
                            <Statistic
                                title="Mevcut Altın Fiyatı (24K TRY/gram)"
                                value={goldPrice.pricePerGramTRY}
                                suffix="₺"
                                valueStyle={{ color: '#cf1322', fontWeight: 'bold' }}
                                prefix={<DollarOutlined />}
                            />
                        </Col>
                        <Col>
                            <Statistic
                                title="Kaynak"
                                value={goldPrice.source === 'manual-admin' ? 'Manuel (Admin)' : goldPrice.source}
                                valueStyle={{ color: '#888', fontSize: 14 }}
                            />
                        </Col>
                    </Row>
                )}

                <Form
                    form={goldForm}
                    layout="inline"
                    onFinish={handleSaveGoldPrice}
                >
                    <Form.Item
                        name="pricePerGramTRY"
                        label="24K Altın Fiyatı (TRY/gram)"
                        rules={[
                            { required: true, message: 'Fiyat zorunludur' },
                            { type: 'number', min: 1, message: 'Geçerli bir fiyat girin' }
                        ]}
                    >
                        <InputNumber
                            min={1}
                            max={99999}
                            step={10}
                            precision={2}
                            placeholder="örn: 3150.00"
                            style={{ width: 200 }}
                            addonAfter="₺/gram"
                        />
                    </Form.Item>
                    <Form.Item
                        name="usdTryRate"
                        label="USD/TRY Kuru"
                        rules={[
                            { required: true, message: 'Dolar kuru zorunludur' },
                            { type: 'number', min: 1, message: 'Geçerli bir kur girin' }
                        ]}
                    >
                        <InputNumber
                            min={1}
                            max={9999}
                            step={0.1}
                            precision={2}
                            placeholder="örn: 38.50"
                            style={{ width: 150 }}
                            addonAfter="₺/$"
                        />
                    </Form.Item>
                    <Form.Item>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={savingGold}
                            icon={<SyncOutlined />}
                            style={{ backgroundColor: '#f5a623', borderColor: '#f5a623' }}
                        >
                            Fiyatı Kaydet & Senkronize Et
                        </Button>
                    </Form.Item>
                </Form>

                {syncResult && (
                    <Alert
                        type="success"
                        message={syncResult}
                        showIcon
                        style={{ marginTop: 16 }}
                        closable
                        onClose={() => setSyncResult(null)}
                    />
                )}
            </Card>

            {/* AI Settings */}
            <Card
                title={<><RobotOutlined style={{ color: '#722ed1', marginRight: 8 }} />AI Ayarları</>}
                bordered={false}
                style={{ marginBottom: 24 }}
            >
                <Alert
                    type="info"
                    showIcon
                    style={{ marginBottom: 20 }}
                    message="AI servis ayarlarını yapılandırın. Satıcıların abonelik paketlerine göre AI özellikleri otomatik olarak açılıp kapanır."
                />
                <Form
                    form={aiForm}
                    layout="vertical"
                    onFinish={handleSaveAI}
                >
                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item name="ai_provider" label="AI Sağlayıcı" rules={[{ required: true }]}>
                                <Select>
                                    <Select.Option value="openai">OpenAI</Select.Option>
                                    <Select.Option value="openrouter">OpenRouter</Select.Option>
                                    <Select.Option value="gemini">Gemini</Select.Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="ai_api_key" label="API Anahtarı">
                                <Input.Password placeholder="sk-..." />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="ai_model" label="Model">
                                <Input placeholder="gpt-4o-mini" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Divider orientation="left">Kredi Paketleri</Divider>
                    <p style={{ color: '#888', marginBottom: 16 }}>
                        Satıcıların satın alabileceği AI kredi paketleri. Format: {'[{"credits":100,"price":50}]'}
                    </p>
                    <Form.Item name="ai_credit_packs">
                        <Input.TextArea rows={3} placeholder='[{"credits":100,"price":50},{"credits":500,"price":200}]' />
                    </Form.Item>

                    <Row gutter={16}>
                        <Col span={6}>
                            <Form.Item name="ai_translation_cost" label="Çeviri Maliyeti (kredi)">
                                <InputNumber min={0} style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col span={6}>
                            <Form.Item name="ai_content_cost" label="İçerik Maliyeti (kredi)">
                                <InputNumber min={0} style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Space>
                        <Button type="primary" htmlType="submit" loading={savingAI} icon={<RobotOutlined />}>
                            AI Ayarlarını Kaydet
                        </Button>
                        <Button onClick={handleTestAI} loading={testingAI}>
                            Test Bağlantı
                        </Button>
                    </Space>

                    {aiTestResult && (
                        <Alert
                            type={aiTestResult.success ? 'success' : 'error'}
                            message={aiTestResult.message}
                            showIcon
                            icon={aiTestResult.success ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                            style={{ marginTop: 16 }}
                            closable
                            onClose={() => setAITestResult(null)}
                        />
                    )}
                </Form>
            </Card>

            {/* Etsy Settings */}
            <Card title="Sistem Ayarları" bordered={false}>
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSave}
                >
                    <Divider orientation="left">Etsy Entegrasyon Ayarları (Master App)</Divider>
                    <p style={{ color: '#888', marginBottom: 20 }}>
                        Satıcıların OAuth üzerinden Etsy'ye bağlanabilmesi için sizin ana uygulamanızın (Master App) API anahtarlarını aşağıya girmelisiniz.
                    </p>

                    <Form.Item
                        name="etsy_api_key"
                        label="Etsy Keystring (Client ID)"
                        rules={[{ required: true, message: 'Lütfen Etsy Keystring değerini girin' }]}
                    >
                        <Input placeholder="Etsy Developer Portal'dan aldığınız Keystring" />
                    </Form.Item>

                    <Form.Item
                        name="etsy_api_secret"
                        label="Etsy Shared Secret"
                        rules={[{ required: true, message: 'Lütfen Etsy Shared Secret değerini girin' }]}
                    >
                        <Input.Password placeholder="Etsy Developer Portal'dan aldığınız Shared Secret" />
                    </Form.Item>

                    <Divider orientation="left">Diğer Ayarlar</Divider>
                    <p style={{ color: '#888', marginBottom: 20 }}>
                        İlerleyen zamanda platform genelindeki diğer tüm global ayarları buraya ekleyebilirsiniz.
                    </p>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={saving}>
                            Ayarları Kaydet
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
}
