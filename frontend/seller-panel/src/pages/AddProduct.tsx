
import React, { useState, useEffect } from 'react';
import {
    Form, Input, Button, InputNumber, message, Upload,
    Select, Radio, Checkbox, Space, Card, Tag, Typography, Divider, Statistic
} from 'antd';
import {
    PlusOutlined, VideoCameraOutlined,
    DoubleRightOutlined, InfoCircleOutlined
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
    'Bilezik', 'Kolye', 'Yüzük', 'Küpe', 'Gram Altın', 'Cumhuriyet Altını', 'Çeyrek Altın', 'Pırlanta'
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
    const [goldPrice, setGoldPrice] = useState<number>(0);
    const [usdRate, setUsdRate] = useState<number>(31.5);
    const [pricingType, setPricingType] = useState<'TL' | 'USD' | 'GRAM'>('TL');
    const [estimatedPrice, setEstimatedPrice] = useState<number>(0);
    const [tags, setTags] = useState<string[]>([]);

    useEffect(() => {
        fetchMarketData();
    }, []);

    const fetchMarketData = async () => {
        try {
            const [gpRes, usdRes] = await Promise.all([
                client.get('/gold-price/current'),
                // Mocking USD for now as we don't have a direct endpoint in backend yet
                Promise.resolve({ data: { rate: 31.5 } })
            ]);
            setGoldPrice(gpRes.data.price);
            setUsdRate(usdRes.data.rate);
        } catch (error) {
            console.error('Market data fetch error', error);
        }
    };

    const handlePriceChange = () => {
        const values = form.getFieldsValue();
        let price = 0;
        if (values.pricingType === 'TL') {
            price = values.basePrice || 0;
        } else if (values.pricingType === 'USD') {
            price = (values.basePrice || 0) * usdRate;
        } else if (values.pricingType === 'GRAM') {
            price = (values.gramWeight || 0) * goldPrice;
        }
        setEstimatedPrice(Math.round(price));
    };

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
                images: [], // Simplified for this demo
                marketplaces: values.marketplaces || []
            });

            message.success('Ürün başarıyla kaydedildi!');
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
                pricingType: 'TL',
                marketplaces: ['golden'],
                ...initialValues
            }}
            onFinish={onFinish}
            onValuesChange={(changed) => {
                if (changed.pricingType || changed.basePrice || changed.gramWeight) {
                    if (changed.pricingType) setPricingType(changed.pricingType);
                    handlePriceChange();
                }
            }}
        >
            <Card title="Temel Bilgiler" style={{ marginBottom: 16 }}>
                <Form.Item name="title" label="Ürün Adı" rules={[{ required: true, message: 'Ürün adı gerekli' }]}>
                    <Input placeholder="Örn: 22 Ayar Altın Kolye" onChange={handleTitleChange} />
                </Form.Item>

                <Form.Item name="category" label="Kategori" rules={[{ required: true, message: 'Kategori seçiniz' }]}>
                    <Select placeholder="Kategori Seçin" onChange={handleCategoryChange}>
                        {CATEGORIES.map(c => <Option key={c} value={c}>{c}</Option>)}
                    </Select>
                </Form.Item>

                <Form.Item label="Otomatik Etiketler">
                    <Space size={[0, 8]} wrap>
                        {tags.map(tag => (
                            <Tag color="blue" key={tag}>{tag}</Tag>
                        ))}
                    </Space>
                    {tags.length === 0 && <Text type="secondary" style={{ fontSize: '0.85em' }}>İsim ve kategori girildikçe oluşur.</Text>}
                </Form.Item>
            </Card>

            <Card title="Fiyatlandırma ve Stok" style={{ marginBottom: 16 }}>
                <Form.Item name="pricingType" label="Fiyatlandırma Türü">
                    <Radio.Group optionType="button" buttonStyle="solid">
                        <Radio value="TL">Türk Lirası (₺)</Radio>
                        <Radio value="USD">Dolar ($)</Radio>
                        <Radio value="GRAM">Altın (Gram)</Radio>
                    </Radio.Group>
                </Form.Item>

                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    {pricingType === 'GRAM' ? (
                        <Form.Item name="gramWeight" label="Gram Ağırlığı" rules={[{ required: true }]} style={{ flex: 1 }}>
                            <InputNumber style={{ width: '100%' }} min={0.01} step={0.01} placeholder="Örn: 5.25" />
                        </Form.Item>
                    ) : (
                        <Form.Item name="basePrice" label={`Birim Fiyat (${pricingType})`} rules={[{ required: true }]} style={{ flex: 1 }}>
                            <InputNumber style={{ width: '100%' }} min={0} placeholder="Örn: 1500" />
                        </Form.Item>
                    )}

                    <Card size="small" style={{ flex: 1, background: '#fffbe6', border: '1px solid #ffe58f' }}>
                        <Statistic
                            title="Tahmini TL Karşılığı"
                            value={estimatedPrice}
                            suffix="₺"
                            valueStyle={{ color: '#cf1322' }}
                        />
                        <Text type="secondary" style={{ fontSize: '0.75em' }}>
                            <InfoCircleOutlined /> Mevcut kur üzerinden hesaplanmıştır.
                        </Text>
                    </Card>
                </div>

                <div style={{ display: 'flex', gap: 16 }}>
                    <Form.Item name="quantity" label="Stok Adedi" rules={[{ required: true }]} style={{ flex: 1 }}>
                        <InputNumber style={{ width: '100%' }} min={0} />
                    </Form.Item>

                    <Form.Item name="sku" label="SKU (Stok Kodu)" rules={[{ required: true }]} style={{ flex: 1 }}>
                        <Input placeholder="Örn: ALT-KLY-001" />
                    </Form.Item>
                </div>
            </Card>

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

            <Card title="Pazaryeri Dağıtımı" style={{ marginBottom: 16 }}>
                <Form.Item name="marketplaces">
                    <Checkbox.Group options={MARKETPLACES} />
                </Form.Item>
                <div style={{ marginTop: 8, padding: '8px 12px', background: '#f0f2f5', borderRadius: 4 }}>
                    <Text type="secondary" style={{ fontSize: '0.85em' }}>
                        <DoubleRightOutlined /> Seçilen tüm pazaryerlerine otomatik senkronizasyon yapılacaktır.
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
