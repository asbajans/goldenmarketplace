
import React, { useState, useEffect, useCallback } from 'react';
import {
    Form, Input, Button, InputNumber, message, Upload,
    Select, Checkbox, Space, Card, Tag, Typography, Statistic, Row, Col, Divider
} from 'antd';
import {
    PlusOutlined, VideoCameraOutlined,
    DoubleRightOutlined, InfoCircleOutlined,
    DollarOutlined, GoldOutlined
} from '@ant-design/icons';
import { createProduct } from '../api/product';
import client from '../api/client';

const { Option } = Select;
const { Text } = Typography;

interface AddProductProps {
    initialValues?: any;
    onSuccess: () => void;
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

const MARKETPLACES = [
    { label: 'Trendyol', value: 'trendyol' },
    { label: 'Hepsiburada', value: 'hepsiburada' },
    { label: 'Amazon', value: 'amazon' },
    { label: 'Golden Marketplace', value: 'golden' }
];

const AddProduct: React.FC<AddProductProps> = ({ initialValues, onSuccess }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [gold24KGramTRY, setGold24KGramTRY] = useState<number>(0);
    const [usdTryRate, setUsdTryRate] = useState<number>(38.5);
    const [priceTRY, setPriceTRY] = useState<number>(0);
    const [priceUSD, setPriceUSD] = useState<number>(0);
    const [tags, setTags] = useState<string[]>([]);

    useEffect(() => {
        fetchGoldPrice();
    }, []);

    const fetchGoldPrice = async () => {
        try {
            const res = await client.get('/gold-price/current');
            setGold24KGramTRY(res.data.pricePerGramTRY);
            setUsdTryRate(res.data.usdTryRate);
        } catch (error) {
            console.error('Gold price fetch error', error);
        }
    };

    const calculateLivePrice = useCallback((gramWeight?: number, milyem?: number) => {
        const gw = gramWeight || 0;
        const ml = milyem || 0;

        if (gw > 0 && ml > 0 && gold24KGramTRY > 0) {
            const tl = gw * (ml / 1000) * gold24KGramTRY;
            const usd = tl / usdTryRate;
            setPriceTRY(Math.round(tl * 100) / 100);
            setPriceUSD(Math.round(usd * 100) / 100);
        } else {
            setPriceTRY(0);
            setPriceUSD(0);
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
            await createProduct({
                ...values,
                tags,
                images: [],
                marketplaces: values.marketplaces || []
            });

            message.success('Ürün başarıyla kaydedildi!');
            form.resetFields();
            setPriceTRY(0);
            setPriceUSD(0);
            setTags([]);
            onSuccess();
        } catch (error: any) {
            console.error(error);
            message.error('Hata oluştu: ' + (error.response?.data?.error?.message || 'Bilinmeyen hata'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Form
            form={form}
            layout="vertical"
            initialValues={{
                milyem: 916,
                marketplaces: ['golden'],
                ...initialValues
            }}
            onFinish={onFinish}
            onValuesChange={(changed, allValues) => {
                if (changed.gramWeight !== undefined || changed.milyem !== undefined) {
                    calculateLivePrice(allValues.gramWeight, allValues.milyem);
                }
            }}
        >
            {/* TEMEL BİLGİLER */}
            <Card title="Temel Bilgiler" style={{ marginBottom: 16 }}>
                <Form.Item name="title" label="Ürün Adı" rules={[{ required: true, message: 'Ürün adı gerekli' }]}>
                    <Input placeholder="Örn: 22 Ayar Altın Burma Bilezik" onChange={handleTitleChange} />
                </Form.Item>

                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item name="category" label="Kategori" rules={[{ required: true, message: 'Kategori seçiniz' }]}>
                            <Select placeholder="Kategori Seçin" onChange={handleCategoryChange}>
                                {CATEGORIES.map(c => <Option key={c} value={c}>{c}</Option>)}
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="sku" label="SKU (Stok Kodu)" rules={[{ required: true }]}>
                            <Input placeholder="Örn: ALT-BLZ-001" />
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
                        24K Gram: {gold24KGramTRY.toLocaleString('tr-TR')} ₺
                    </Text>
                }
            >
                <Row gutter={16}>
                    <Col span={8}>
                        <Form.Item
                            name="gramWeight"
                            label="Gram Ağırlığı"
                            rules={[{ required: true, message: 'Gram ağırlığı gerekli' }]}
                        >
                            <InputNumber
                                style={{ width: '100%' }}
                                min={0.01}
                                step={0.01}
                                placeholder="Örn: 14.50"
                                addonAfter="gr"
                            />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item
                            name="milyem"
                            label="Milyem (Saflık)"
                            rules={[{ required: true, message: 'Milyem seçiniz' }]}
                        >
                            <Select placeholder="Milyem Seçin">
                                {MILYEM_OPTIONS.map(m => (
                                    <Option key={m.value} value={m.value}>{m.label}</Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col span={8}>
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

                <Row gutter={16}>
                    <Col span={12}>
                        <Card size="small" style={{ background: '#fffbe6', border: '1px solid #ffe58f', textAlign: 'center' }}>
                            <Statistic
                                title="Tahmini TL Fiyatı"
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
                                title="Tahmini USD Fiyatı"
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
                        <InfoCircleOutlined /> Fiyatlar saatte 1 otomatik güncellenir.
                        Formül: Gram × (Milyem ÷ 1000) × 24K Gram Kuru
                    </Text>
                </div>
            </Card>

            {/* MEDYA */}
            <Card title="Medya ve Açıklama" style={{ marginBottom: 16 }}>
                <Form.Item label="Ürün Görselleri (Maks 6)">
                    <Upload listType="picture-card" maxCount={6} beforeUpload={() => false}>
                        <div>
                            <PlusOutlined />
                            <div style={{ marginTop: 8 }}>Yükle</div>
                        </div>
                    </Upload>
                </Form.Item>

                <Form.Item label="Ürün Videosu">
                    <Upload maxCount={1} beforeUpload={() => false}>
                        <Button icon={<VideoCameraOutlined />}>Video Seç</Button>
                    </Upload>
                </Form.Item>

                <Form.Item name="description" label="Ürün Açıklaması">
                    <Input.TextArea rows={4} placeholder="Ürün detaylarını buraya yazın..." />
                </Form.Item>
            </Card>

            {/* PAZARYERI */}
            <Card title="Pazaryeri Dağıtımı" style={{ marginBottom: 16 }}>
                <Form.Item name="marketplaces">
                    <Checkbox.Group options={MARKETPLACES} />
                </Form.Item>
                <div style={{ marginTop: 8, padding: '8px 12px', background: '#f0f2f5', borderRadius: 4 }}>
                    <Text type="secondary" style={{ fontSize: '0.85em' }}>
                        <DoubleRightOutlined /> Fiyatlar saatte 1 güncellenir ve seçilen pazaryerlerine otomatik senkronize edilir.
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
