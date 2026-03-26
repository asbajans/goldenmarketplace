
import React, { useState, useEffect, useCallback } from 'react';
import {
    Form, Input, Button, InputNumber, message, Upload,
    Select, Checkbox, Space, Card, Tag, Typography, Statistic, Row, Col, Divider, Spin, Tooltip
} from 'antd';
import {
    PlusOutlined, VideoCameraOutlined,
    DoubleRightOutlined, InfoCircleOutlined,
    DollarOutlined, GoldOutlined, PercentageOutlined,
    ShopOutlined, CheckCircleOutlined, ThunderboltOutlined
} from '@ant-design/icons';
import { createProduct } from '../api/product';
import client from '../api/client';

const { Option } = Select;
const { Text } = Typography;

interface AddProductProps {
    initialValues?: any;
    onSuccess: () => void;
}

interface Integration {
    id: string;
    platform: string;
    isActive: boolean;
}

const CATEGORIES = [
    'Bilezik', 'Kolye', 'Yüzük', 'Küpe', 'Gram Altın',
    'Cumhuriyet Altını', 'Çeyrek Altın', 'Yarım Altın',
    'Tam Altın', 'Pırlanta', 'Gümüş', 'Diğer'
];

const MILYEM_OPTIONS = [
    { value: 333, label: '333 Milyem (8 Ayar)' },
    { value: 585, label: '585 Milyem (14 Ayar)' },
    { value: 750, label: '750 Milyem (18 Ayar)' },
    { value: 916, label: '916 Milyem (22 Ayar)' },
    { value: 999, label: '999 Milyem (24 Ayar / Has Altın)' },
];

const ALL_PLATFORMS = [
    { key: 'golden', name: 'Golden Marketplace', color: '#d4a017' },
    { key: 'etsy', name: 'Etsy', color: '#F56400' },
    { key: 'amazon', name: 'Amazon', color: '#FF9900' },
    { key: 'trendyol', name: 'Trendyol', color: '#F27A1A' },
    { key: 'hepsiburada', name: 'Hepsiburada', color: '#FF6000' },
    { key: 'n11', name: 'N11', color: '#5333ED' },
    { key: 'pazarama', name: 'Pazarama', color: '#E4002B' },
];

const AddProduct: React.FC<AddProductProps> = ({ initialValues, onSuccess }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [gold24KGramTRY, setGold24KGramTRY] = useState<number>(0);
    const [usdTryRate, setUsdTryRate] = useState<number>(38.5);
    const [priceTRY, setPriceTRY] = useState<number>(0);
    const [priceUSD, setPriceUSD] = useState<number>(0);
    const [b2bPrice, setB2bPrice] = useState<number>(0);
    const [isB2BEnabled, setIsB2BEnabled] = useState(false);
    const [tags, setTags] = useState<string[]>([]);
    const [integrations, setIntegrations] = useState<Integration[]>([]);
    const [integrationsLoading, setIntegrationsLoading] = useState(true);

    const isCloned = !!initialValues?.originalStoreName;

    useEffect(() => {
        fetchGoldPrice();
        fetchIntegrations();
    }, []);

    const fetchGoldPrice = async () => {
        try {
            const res = await client.get('/gold-price/current');
            setGold24KGramTRY(res.data.pricePerGramTRY);
            if (res.data.usdTryRate && res.data.usdTryRate > 0) {
                setUsdTryRate(res.data.usdTryRate);
            }
        } catch (error) {
            console.error('Gold price fetch error', error);
        }
    };

    const fetchIntegrations = async () => {
        try {
            const { data } = await client.get('/integrations');
            setIntegrations(Array.isArray(data) ? data : ((data as any)?.data || []));
        } catch (error) {
            console.error('Failed to fetch integrations', error);
        } finally {
            setIntegrationsLoading(false);
        }
    };

    const calculateLivePrice = useCallback((gramWeight?: number, milyem?: number, profitMargin?: number, b2bDiscount?: number) => {
        const gw = gramWeight || 0;
        const ml = milyem || 0;
        const pm = profitMargin || 0;
        const bd = b2bDiscount || 0;

        if (gw > 0 && ml > 0 && gold24KGramTRY > 0) {
            const materialCost = gw * (ml / 1000) * gold24KGramTRY;
            const tl = materialCost * (1 + pm / 100);
            const usd = tl / usdTryRate;
            const b2b = tl * (1 - bd / 100);
            setPriceTRY(Math.round(tl * 100) / 100);
            setPriceUSD(Math.round(usd * 100) / 100);
            setB2bPrice(Math.round(b2b * 100) / 100);
        } else {
            setPriceTRY(0);
            setPriceUSD(0);
            setB2bPrice(0);
        }
    }, [gold24KGramTRY, usdTryRate]);

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const title = e.target.value;
        const category = form.getFieldValue('category') || '';
        generateTags(title, category);
    };

    const handleCategoryChange = (category: string) => {
        const title = form.getFieldValue('title') || '';
        generateTags(title, category);
    };

    const generateTags = (title: string, category: string) => {
        const combined = `${title} ${category}`.toLowerCase();
        const words = combined.split(/[\s,.-]+/).filter(w => w.length > 2);
        setTags(Array.from(new Set(words)));
    };

    const onFinish = async (values: any) => {
        setLoading(true);
        try {
            const b2bDiscount = values.b2bDiscount || 0;
            const computedB2bPrice = isB2BEnabled && b2bDiscount > 0
                ? Math.round(priceTRY * (1 - b2bDiscount / 100) * 100) / 100
                : priceTRY;

            await createProduct({
                ...values,
                profitMargin: values.profitMargin || 0,
                quantity: Number(values.quantity || 0),
                tags,
                images: [],
                marketplaces: values.marketplaces || ['golden'],
                isB2BEnabled,
                b2bDiscount: isB2BEnabled ? b2bDiscount : 0,
                b2bPrice: computedB2bPrice
            });

            message.success('Ürün başarıyla kaydedildi!');
            form.resetFields();
            setPriceTRY(0);
            setPriceUSD(0);
            setB2bPrice(0);
            setIsB2BEnabled(false);
            setTags([]);
            onSuccess();
        } catch (error: any) {
            console.error(error);
            message.error('Hata oluştu: ' + (error.response?.data?.error?.message || 'Bilinmeyen hata'));
        } finally {
            setLoading(false);
        }
    };

    // Build marketplace options from all platforms + mark connected ones
    const marketplaceOptions = ALL_PLATFORMS.map(p => {
        const isConnected = p.key === 'golden' || (integrations || []).some((i: any) => i.platform === p.key && i.isActive);
        return {
            label: (
                <span>
                    <ShopOutlined style={{ color: p.color, marginRight: 4 }} />
                    {p.name}
                    {isConnected && <CheckCircleOutlined style={{ color: '#52c41a', marginLeft: 4, fontSize: 11 }} />}
                    {!isConnected && p.key !== 'golden' && <Tag color="default" style={{ marginLeft: 4, fontSize: 10 }}>Bağlı Değil</Tag>}
                </span>
            ),
            value: p.key,
            disabled: !isConnected && p.key !== 'golden'
        };
    });

    return (
        <Form
            form={form}
            layout="vertical"
            initialValues={{
                milyem: 916,
                profitMargin: 0,
                marketplaces: ['golden'],
                ...initialValues
            }}
            onFinish={onFinish}
            onValuesChange={(changed, allValues) => {
                if (changed.gramWeight !== undefined || changed.milyem !== undefined || changed.profitMargin !== undefined || changed.b2bDiscount !== undefined) {
                    calculateLivePrice(allValues.gramWeight, allValues.milyem, allValues.profitMargin, allValues.b2bDiscount);
                }
            }}
        >
            {/* TEMEL BİLGİLER */}
            <Card title="Temel Bilgiler" style={{ marginBottom: 16 }}>
                {isCloned && (
                    <div style={{ marginBottom: 16, padding: '8px 12px', background: '#fff2e8', border: '1px solid #ffd8bf', color: '#d4380d', borderRadius: 4 }}>
                        <InfoCircleOutlined style={{ marginRight: 8 }} />
                        Bu ürün B2B sisteminden kopyalanmıştır. Sadece Stok Adedi, Kâr Marjı ve Pazaryeri ayarları değiştirilebilir.
                    </div>
                )}
                <Form.Item name="title" label="Ürün Adı" rules={[{ required: true, message: 'Ürün adı gerekli' }]}>
                    <Input placeholder="Örn: 22 Ayar Altın Burma Bilezik" onChange={handleTitleChange} disabled={isCloned} />
                </Form.Item>

                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item name="category" label="Kategori" rules={[{ required: true, message: 'Kategori seçiniz' }]}>
                            <Select placeholder="Kategori Seçin" onChange={handleCategoryChange} disabled={isCloned}>
                                {CATEGORIES.map(c => <Option key={c} value={c}>{c}</Option>)}
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item
                            name="sku"
                            label={
                                <span>
                                    SKU (Stok Kodu){' '}
                                    <Tooltip title="Her ürün için benzersiz olmalıdır. Şirket adı yerine ürüne özel bir kod kullanın (Örn: BLZ-001).">
                                        <InfoCircleOutlined style={{ color: '#888', fontSize: 12 }} />
                                    </Tooltip>
                                </span>
                            }
                            rules={[{ required: true, message: 'SKU gerekli' }]}
                        >
                            <Input
                                disabled={isCloned}
                                placeholder="Örn: BLZ-14K-001 (benzersiz olmalı)"
                                addonAfter={
                                    <Tooltip title="Otomatik SKU oluştur">
                                        <ThunderboltOutlined
                                            style={{ cursor: 'pointer', color: '#d4a017' }}
                                            onClick={() => {
                                                const cat = (form.getFieldValue('category') || 'PRD').substring(0, 3).toUpperCase();
                                                const ts = Date.now().toString().slice(-5);
                                                form.setFieldValue('sku', `${cat}-${ts}`);
                                            }}
                                        />
                                    </Tooltip>
                                }
                            />
                        </Form.Item>
                    </Col>
                </Row>

                <Form.Item label="Otomatik Etiketler">
                    <Space size={[0, 8]} wrap>
                        {tags.map(tag => (
                            <Tag color="gold" key={tag}>{tag}</Tag>
                        ))}
                    </Space>
                    {tags.length === 0 && <Text type="secondary" style={{ fontSize: '0.85em' }}>İsim ve kategori girildikçe oluşur.</Text>}
                </Form.Item>
            </Card>

            {/* ALTIN FİYATLANDIRMA */}
            <Card
                title={<><GoldOutlined style={{ color: '#d4a017' }} /> Altın Fiyatlandırma</>}
                style={{ marginBottom: 16 }}
                extra={
                    <Text type="secondary" style={{ fontSize: '0.75em' }}>
                        24K Gram: {(gold24KGramTRY || 0).toLocaleString('tr-TR')} ₺
                    </Text>
                }
            >
                <Row gutter={16}>
                    <Col span={6}>
                        <Form.Item
                            name="gramWeight"
                            label="Gram Ağırlığı"
                            rules={[{ required: true, message: 'Gram gerekli' }]}
                        >
                            <InputNumber
                                disabled={isCloned}
                                style={{ width: '100%' }}
                                min={0.01}
                                step={0.01}
                                placeholder="14.50"
                                addonAfter="gr"
                            />
                        </Form.Item>
                    </Col>
                    <Col span={6}>
                        <Form.Item
                            name="milyem"
                            label="Milyem (Saflık)"
                            rules={[{ required: true, message: 'Milyem seçiniz' }]}
                        >
                            <Select placeholder="Milyem Seçin" disabled={isCloned}>
                                {MILYEM_OPTIONS.map(m => (
                                    <Option key={m.value} value={m.value}>{m.label}</Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col span={6}>
                        <Form.Item
                            name="profitMargin"
                            label={<><PercentageOutlined /> Kâr Marjı (%)</>}
                            rules={[{ required: true }]}
                        >
                            <InputNumber
                                style={{ width: '100%' }}
                                min={0}
                                max={500}
                                step={1}
                                placeholder="15"
                                addonAfter="%"
                            />
                        </Form.Item>
                    </Col>
                    <Col span={6}>
                        <Form.Item
                            name="quantity"
                            label="Stok Adedi"
                            rules={[{ required: true }]}
                        >
                            <InputNumber style={{ width: '100%' }} min={0} placeholder="0" />
                        </Form.Item>
                    </Col>
                </Row>

                <Divider style={{ margin: '12px 0' }} />

                {/* B2B Section */}
                <div style={{ background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 8, padding: '12px 16px', marginBottom: 12 }}>
                    <Checkbox
                        disabled={isCloned}
                        checked={isB2BEnabled}
                        onChange={e => setIsB2BEnabled(e.target.checked)}
                        style={{ fontWeight: 600, color: '#389e0d' }}
                    >
                        🤝 B2B'ye Açık — Diğer satıcılar bu ürünü kendi mağazalarına ekleyebilsin
                    </Checkbox>
                    {isB2BEnabled && (
                        <Row gutter={16} style={{ marginTop: 12 }}>
                            <Col span={12}>
                                <Form.Item
                                    name="b2bDiscount"
                                    label={<><PercentageOutlined /> B2B İskonto (%)</>}
                                    rules={[{ required: true, message: 'B2B iskontosu gerekli' }]}
                                >
                                    <InputNumber
                                        disabled={isCloned}
                                        style={{ width: '100%' }}
                                        min={0}
                                        max={99}
                                        step={1}
                                        placeholder="20"
                                        addonAfter="%"
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Card size="small" style={{ background: '#d9f7be', border: '1px solid #73d13d', textAlign: 'center' }}>
                                    <Statistic
                                        title="B2B Satış Fiyatı (TL)"
                                        value={b2bPrice}
                                        precision={2}
                                        suffix="₺"
                                        valueStyle={{ color: '#389e0d', fontWeight: 'bold' }}
                                    />
                                </Card>
                            </Col>
                        </Row>
                    )}
                </div>

                <Row gutter={16}>
                    <Col span={12}>
                        <Card size="small" style={{ background: '#fffbe6', border: '1px solid #ffe58f', textAlign: 'center' }}>
                            <Statistic
                                title="Satış Fiyatı (TL)"
                                value={priceTRY}
                                precision={2}
                                suffix="₺"
                                valueStyle={{ color: '#cf1322', fontWeight: 'bold' }}
                            />
                        </Card>
                    </Col>
                    <Col span={12}>
                        <Card size="small" style={{ background: '#f0f5ff', border: '1px solid #adc6ff', textAlign: 'center' }}>
                            <Statistic
                                title="Satış Fiyatı (USD)"
                                value={priceUSD}
                                precision={2}
                                prefix={<DollarOutlined />}
                                valueStyle={{ color: '#1890ff', fontWeight: 'bold' }}
                            />
                        </Card>
                    </Col>
                </Row>

                <div style={{ marginTop: 8, textAlign: 'center' }}>
                    <Text type="secondary" style={{ fontSize: '0.75em' }}>
                        <InfoCircleOutlined /> Formül: Gram × (Milyem ÷ 1000) × 24K Kur × (1 + Kâr%). Altın fiyatı admin tarafından güncellenir.
                    </Text>
                </div>
            </Card>

            {/* MEDYA */}
            <Card title="Medya ve Açıklama" style={{ marginBottom: 16 }}>
                <Form.Item label="Ürün Görselleri (Maks 6)">
                    <Upload disabled={isCloned} listType="picture-card" maxCount={6} beforeUpload={() => false}>
                        <div>
                            <PlusOutlined />
                            <div style={{ marginTop: 8 }}>Yükle</div>
                        </div>
                    </Upload>
                </Form.Item>

                <Form.Item label="Ürün Videosu">
                    <Upload disabled={isCloned} maxCount={1} beforeUpload={() => false}>
                        <Button disabled={isCloned} icon={<VideoCameraOutlined />}>Video Seç</Button>
                    </Upload>
                </Form.Item>

                <Form.Item name="description" label="Ürün Açıklaması">
                    <Input.TextArea disabled={isCloned} rows={4} placeholder="Ürün detaylarını buraya yazın..." />
                </Form.Item>
            </Card>

            {/* PAZARYERI ENTEGRASYONLARI */}
            <Card
                title="Pazaryeri Dağıtımı"
                style={{ marginBottom: 16 }}
                extra={integrationsLoading ? <Spin size="small" /> : null}
            >
                <Form.Item name="marketplaces">
                    <Checkbox.Group style={{ width: '100%' }}>
                        <Row gutter={[16, 12]}>
                            {marketplaceOptions.map(opt => (
                                <Col span={8} key={opt.value}>
                                    <Checkbox value={opt.value} disabled={opt.disabled}>
                                        {opt.label}
                                    </Checkbox>
                                </Col>
                            ))}
                        </Row>
                    </Checkbox.Group>
                </Form.Item>
                <div style={{ marginTop: 8, padding: '8px 12px', background: '#f0f2f5', borderRadius: 4 }}>
                    <Text type="secondary" style={{ fontSize: '0.85em' }}>
                        <DoubleRightOutlined /> Altın fiyatı güncellendiğinde bağlı pazaryerlerine otomatik senkronize edilir.
                        Bağlı olmayan platformları <a href="/integrations">Entegrasyonlar</a> sayfasından bağlayabilirsiniz.
                    </Text>
                </div>
            </Card>

            <Form.Item>
                <Button type="primary" htmlType="submit" loading={loading} block size="large">
                    Ürünü Yayınla
                </Button>
            </Form.Item>
        </Form>
    );
};

export default AddProduct;
