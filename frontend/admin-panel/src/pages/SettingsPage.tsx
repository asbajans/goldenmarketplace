import { useEffect, useState } from 'react';
import { Card, Form, Input, Button, message, Divider, Spin, InputNumber, Alert, Statistic, Row, Col } from 'antd';
import { DollarOutlined, SyncOutlined, GoldOutlined } from '@ant-design/icons';
import { AdminAPI } from '../services/api';

interface GoldPriceInfo {
    pricePerGramTRY: number;
    source: string;
    timestamp: string;
}

export default function SettingsPage() {
    const [form] = Form.useForm();
    const [goldForm] = Form.useForm();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savingGold, setSavingGold] = useState(false);
    const [goldPrice, setGoldPrice] = useState<GoldPriceInfo | null>(null);
    const [syncResult, setSyncResult] = useState<string | null>(null);

    useEffect(() => {
        fetchSettings();
        fetchGoldPrice();
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

    const fetchGoldPrice = async () => {
        try {
            const res = await fetch('/api/gold-price/current');
            if (res.ok) {
                const data = await res.json();
                setGoldPrice(data);
            }
        } catch (err) {
            // no-op
        }
    };

    const handleSaveGoldPrice = async (values: { pricePerGramTRY: number }) => {
        try {
            setSavingGold(true);
            setSyncResult(null);
            const res = await fetch('/api/gold-price/set', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ pricePerGramTRY: values.pricePerGramTRY })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Hata oluştu');
            message.success(data.message);
            setSyncResult(data.message);
            fetchGoldPrice(); // Refresh displayed price
        } catch (error: any) {
            message.error(error.message || 'Altın fiyatı kaydedilemedi.');
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
