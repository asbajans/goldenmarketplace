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
    const [feedForm] = Form.useForm();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savingGold, setSavingGold] = useState(false);
    const [savingAI, setSavingAI] = useState(false);
    const [savingFeed, setSavingFeed] = useState(false);
    const [backfilling, setBackfilling] = useState(false);
    const [feedResult, setFeedResult] = useState<string | null>(null);
    const [testingAI, setTestingAI] = useState(false);
    const [aiTestResult, setAITestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [transModels, setTransModels] = useState<Array<{ provider: string; model: string; apiKey?: string }>>([]);
    const [contentModel, setContentModel] = useState<{ provider: string; model: string; apiKey?: string }>({ provider: 'openai', model: '' });
    const [blogModel, setBlogModel] = useState<{ provider: string; model: string; apiKey?: string }>({ provider: 'openai', model: '' });
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
            feedForm.setFieldsValue({
                feed_default_gender: data.feed_default_gender || 'unisex',
                feed_default_age_group: data.feed_default_age_group || 'adult',
                feed_default_color: data.feed_default_color || 'Gold',
                merchant_center_id: data.merchant_center_id || '',
                merchant_target_country: data.merchant_target_country || 'TR',
                merchant_target_language: data.merchant_target_language || 'tr'
            });
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

    const handleSaveFeed = async (values: any) => {
        try {
            setSavingFeed(true);
            setFeedResult(null);
            const res = await AdminAPI.updateSettings(values);
            const backfilled = (res as any)?.backfilledProducts;
            const msg = backfilled
                ? `Feed varsayılanları kaydedildi. Değeri boş ${backfilled} ürün güncellendi.`
                : 'Feed varsayılanları kaydedildi!';
            setFeedResult(msg);
            message.success(msg);
        } catch (error: any) {
            message.error(error.response?.data?.error || 'Feed ayarları kaydedilemedi.');
        } finally {
            setSavingFeed(false);
        }
    };

    const handleBackfill = async () => {
        try {
            setBackfilling(true);
            const values = feedForm.getFieldsValue();
            const res = await AdminAPI.backfillFeedAttributes({
                gender: values.feed_default_gender,
                ageGroup: values.feed_default_age_group,
                color: values.feed_default_color
            });
            const msg = `Toplu doldurma tamamlandı: ${res.updated} ürün güncellendi (${res.scanned} eksik kayıt tarandı).`;
            setFeedResult(msg);
            message.success(msg);
        } catch (error: any) {
            message.error(error.response?.data?.error || 'Toplu doldurma başarısız.');
        } finally {
            setBackfilling(false);
        }
    };

    const parseModelEntry = (raw: any): { provider: string; model: string; apiKey?: string } => {
        try {
            const obj = typeof raw === 'string' ? JSON.parse(raw || '{}') : (raw || {});
            return { provider: obj.provider || 'openai', model: obj.model || '', apiKey: obj.apiKey || '' };
        } catch {
            return { provider: 'openai', model: '' };
        }
    };

    const fetchAISettings = async () => {
        try {
            const data = await AdminAPI.getAISettings();
            aiForm.setFieldsValue(data);
            try {
                const arr = typeof data.ai_translation_models === 'string'
                    ? JSON.parse(data.ai_translation_models || '[]')
                    : (data.ai_translation_models || []);
                setTransModels(Array.isArray(arr) ? arr.map((m: any) => ({
                    provider: m.provider || 'openai', model: m.model || '', apiKey: m.apiKey || ''
                })) : []);
            } catch { setTransModels([]); }
            setContentModel(parseModelEntry(data.ai_content_model));
            setBlogModel(parseModelEntry(data.ai_blog_model));
        } catch { /* noop */ }
    };

    const handleSaveAI = async (values: any) => {
        try {
            setSavingAI(true);
            await AdminAPI.updateAISettings({
                ...values,
                ai_translation_models: JSON.stringify(transModels.filter(m => m.model.trim())),
                ai_content_model: JSON.stringify(contentModel.model.trim() ? contentModel : {}),
                ai_blog_model: JSON.stringify(blogModel.model.trim() ? blogModel : {}),
            });
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

            {/* Google Merchant Feed Defaults */}
            <Card
                title="Google Merchant Feed Varsayılanları (gender / age_group / color)"
                bordered={false}
                style={{ marginBottom: 24 }}
            >
                <Alert
                    type="info"
                    showIcon
                    style={{ marginBottom: 20 }}
                    message="Google'ın zorunlu kıldığı cinsiyet, yaş grubu ve renk alanları için varsayılan değerler. Üründe değer yoksa feed'e bu değerler yazılır; kaydetme sırasında değeri boş olan eski ürünler de otomatik doldurulur."
                />
                <Form
                    form={feedForm}
                    layout="vertical"
                    onFinish={handleSaveFeed}
                >
                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item
                                name="feed_default_gender"
                                label="Varsayılan Cinsiyet (gender)"
                                rules={[{ required: true, message: 'Cinsiyet zorunludur' }]}
                            >
                                <Select>
                                    <Select.Option value="female">Kadın (female)</Select.Option>
                                    <Select.Option value="male">Erkek (male)</Select.Option>
                                    <Select.Option value="unisex">Unisex (unisex)</Select.Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item
                                name="feed_default_age_group"
                                label="Varsayılan Yaş Grubu (age_group)"
                                rules={[{ required: true, message: 'Yaş grubu zorunludur' }]}
                            >
                                <Select>
                                    <Select.Option value="newborn">Yenidoğan (newborn, 0-3 ay)</Select.Option>
                                    <Select.Option value="infant">Bebek (infant, 3-12 ay)</Select.Option>
                                    <Select.Option value="toddler">Yürümeye başlayan (toddler, 1-5 yaş)</Select.Option>
                                    <Select.Option value="kids">Çocuk (kids, 5-13 yaş)</Select.Option>
                                    <Select.Option value="adult">Yetişkin (adult, 13+)</Select.Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item
                                name="feed_default_color"
                                label="Varsayılan Renk (color)"
                                rules={[{ required: true, message: 'Renk zorunludur' }]}
                                extra="Birden fazla renk eğik çizgi ile ayrılır: Gold / White"
                            >
                                <Input placeholder="örn: Gold" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Divider orientation="left">Merchant Center</Divider>
                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item name="merchant_center_id" label="Merchant Center ID">
                                <Input placeholder="örn: 123456789" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="merchant_target_country" label="Hedef Ülke">
                                <Input placeholder="TR" maxLength={2} />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="merchant_target_language" label="Hedef Dil">
                                <Input placeholder="tr" maxLength={5} />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Space>
                        <Button type="primary" htmlType="submit" loading={savingFeed}>
                            Feed Varsayılanlarını Kaydet
                        </Button>
                        <Button onClick={handleBackfill} loading={backfilling}>
                            Eksik Değerleri Toplu Doldur
                        </Button>
                    </Space>

                    {feedResult && (
                        <Alert
                            type="success"
                            message={feedResult}
                            showIcon
                            style={{ marginTop: 16 }}
                            closable
                            onClose={() => setFeedResult(null)}
                        />
                    )}
                </Form>
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
                        <Col span={6}>
                            <Form.Item name="ai_provider" label="AI Sağlayıcı" rules={[{ required: true }]}>
                                <Select>
                                    <Select.Option value="openai">OpenAI</Select.Option>
                                    <Select.Option value="openrouter">OpenRouter</Select.Option>
                                    <Select.Option value="gemini">Gemini</Select.Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={6}>
                            <Form.Item name="ai_api_key" label="API Anahtarı">
                                <Input.Password placeholder="sk-..." />
                            </Form.Item>
                        </Col>
                        <Col span={6}>
                            <Form.Item
                                name="ai_model"
                                label="Model"
                                tooltip="OpenAI/Gemini: yalın ad (gpt-4o-mini). OpenRouter: ZORUNLU olarak sağlayıcı/model formatı (openai/gpt-4o-mini). Yanlış format 404 verir: No endpoints found."
                            >
                                <Input placeholder="gpt-4o-mini" />
                            </Form.Item>
                        </Col>
                        <Col span={6}>
                            <Form.Item
                                name="ai_image_model"
                                label="Görsel Modeli"
                                tooltip="Blog kapak görselleri için. Aynı API anahtarı kullanılır. OpenRouter: google/gemini-2.5-flash-image veya recraft/recraft-v4.1-flash · OpenAI: gpt-image-1. Boşsa görsel üretilmez."
                            >
                                <Input placeholder="google/gemini-2.5-flash-image" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Divider orientation="left">Amaca Özel Modeller</Divider>
                    <p style={{ color: '#888', marginBottom: 16 }}>
                        Boş bırakılan her alan genel ayarı (sağlayıcı + anahtar + model) kullanır.
                        Çeviri listesi sırayla denenir: biri hata verirse/yavaşsa (60 sn) sonrakine geçilir.
                    </p>

                    <Card size="small" title="Çeviri Modelleri (yedek zincir)" style={{ marginBottom: 16 }}>
                        {transModels.map((m, i) => (
                            <Row gutter={8} key={i} style={{ marginBottom: 8 }} align="middle">
                                <Col span={1}><b>#{i + 1}</b></Col>
                                <Col span={5}>
                                    <Select
                                        value={m.provider}
                                        style={{ width: '100%' }}
                                        onChange={v => setTransModels(list => list.map((x, j) => j === i ? { ...x, provider: v } : x))}
                                    >
                                        <Select.Option value="openai">OpenAI</Select.Option>
                                        <Select.Option value="openrouter">OpenRouter</Select.Option>
                                        <Select.Option value="gemini">Gemini</Select.Option>
                                    </Select>
                                </Col>
                                <Col span={8}>
                                    <Input
                                        value={m.model}
                                        placeholder="model (örn. openai/gpt-4o-mini)"
                                        onChange={e => setTransModels(list => list.map((x, j) => j === i ? { ...x, model: e.target.value } : x))}
                                    />
                                </Col>
                                <Col span={8}>
                                    <Input.Password
                                        value={m.apiKey || ''}
                                        placeholder="Özel anahtar (boş = genel anahtar)"
                                        onChange={e => setTransModels(list => list.map((x, j) => j === i ? { ...x, apiKey: e.target.value } : x))}
                                    />
                                </Col>
                                <Col span={2}>
                                    <Button danger onClick={() => setTransModels(list => list.filter((_, j) => j !== i))}>Sil</Button>
                                </Col>
                            </Row>
                        ))}
                        <Button
                            type="dashed"
                            onClick={() => setTransModels(list => [...list, { provider: 'openai', model: '', apiKey: '' }])}
                        >
                            + Model Ekle
                        </Button>
                    </Card>

                    <Row gutter={16}>
                        <Col span={8}>
                            <Card size="small" title="İçerik Modeli (açıklama üretimi)" style={{ marginBottom: 16 }}>
                                <Select
                                    value={contentModel.provider}
                                    style={{ width: '100%', marginBottom: 8 }}
                                    onChange={v => setContentModel(m => ({ ...m, provider: v }))}
                                >
                                    <Select.Option value="openai">OpenAI</Select.Option>
                                    <Select.Option value="openrouter">OpenRouter</Select.Option>
                                    <Select.Option value="gemini">Gemini</Select.Option>
                                </Select>
                                <Input
                                    value={contentModel.model}
                                    placeholder="model (boş = genel)"
                                    style={{ marginBottom: 8 }}
                                    onChange={e => setContentModel(m => ({ ...m, model: e.target.value }))}
                                />
                                <Input.Password
                                    value={contentModel.apiKey || ''}
                                    placeholder="Özel anahtar (boş = genel)"
                                    onChange={e => setContentModel(m => ({ ...m, apiKey: e.target.value }))}
                                />
                            </Card>
                        </Col>
                        <Col span={8}>
                            <Card size="small" title="Blog Modeli (taslak + çeviri)" style={{ marginBottom: 16 }}>
                                <Select
                                    value={blogModel.provider}
                                    style={{ width: '100%', marginBottom: 8 }}
                                    onChange={v => setBlogModel(m => ({ ...m, provider: v }))}
                                >
                                    <Select.Option value="openai">OpenAI</Select.Option>
                                    <Select.Option value="openrouter">OpenRouter</Select.Option>
                                    <Select.Option value="gemini">Gemini</Select.Option>
                                </Select>
                                <Input
                                    value={blogModel.model}
                                    placeholder="model (boş = genel)"
                                    style={{ marginBottom: 8 }}
                                    onChange={e => setBlogModel(m => ({ ...m, model: e.target.value }))}
                                />
                                <Input.Password
                                    value={blogModel.apiKey || ''}
                                    placeholder="Özel anahtar (boş = genel)"
                                    onChange={e => setBlogModel(m => ({ ...m, apiKey: e.target.value }))}
                                />
                            </Card>
                        </Col>
                        <Col span={8}>
                            <Card size="small" title="Kuyruk" style={{ marginBottom: 16 }}>
                                <Form.Item
                                    name="ai_queue_concurrency"
                                    label="Eşzamanlı AI işi (1-10)"
                                    tooltip="Çeviri kuyruğu kaç ürünü paralel işlesin. Değişiklik backend restart ister."
                                >
                                    <InputNumber min={1} max={10} style={{ width: '100%' }} placeholder="3" />
                                </Form.Item>
                            </Card>
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
