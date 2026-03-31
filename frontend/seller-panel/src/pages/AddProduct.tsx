
import React, { useState, useEffect, useCallback } from 'react';
import {
    Form, Input, Button, InputNumber, message, Upload,
    Select, Checkbox, Space, Card, Tag, Typography, Statistic, Row, Col, Divider, Spin, Tooltip
} from 'antd';
import type { UploadFile, UploadChangeParam } from 'antd/es/upload';
import type { RcFile } from 'antd/es/upload/interface';
import {
    PlusOutlined, VideoCameraOutlined,
    DoubleRightOutlined, InfoCircleOutlined,
    DollarOutlined, GoldOutlined, PercentageOutlined,
    ShopOutlined, CheckCircleOutlined, ThunderboltOutlined, MinusCircleOutlined
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

interface Category {
    id: string;
    name: string;
    slug: string;
}

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
    const [gramHas, setGramHas] = useState<number>(0);
    const [isB2BEnabled, setIsB2BEnabled] = useState(false);
    const [hasVariants, setHasVariants] = useState(false);
    const [tags, setTags] = useState<string[]>([]);
    const [integrations, setIntegrations] = useState<Integration[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [integrationsLoading, setIntegrationsLoading] = useState(true);
    const [fileList, setFileList] = useState<UploadFile[]>([]);
    const [videoFile, setVideoFile] = useState<UploadFile[]>([]);
    const [selectedMarketplaces, setSelectedMarketplaces] = useState<string[]>(['golden']);
    const [etsyShippingProfiles, setEtsyShippingProfiles] = useState<any[]>([]);
    const [etsyReturnPolicies, setEtsyReturnPolicies] = useState<any[]>([]);
    const [etsyReadinessStates, setEtsyReadinessStates] = useState<any[]>([]);
    const [fetchingEtsyProfiles, setFetchingEtsyProfiles] = useState(false);
    const isCloned = !!initialValues?.originalStoreName;

    useEffect(() => {
        fetchGoldPrice();
        fetchIntegrations();
        fetchCategories();
        // Pre-populate image previews when editing
        if (initialValues?.images && Array.isArray(initialValues.images) && initialValues.images.length > 0) {
            setFileList(
                initialValues.images.map((url: string, i: number) => ({
                    uid: `-${i}`,
                    name: `image-${i}`,
                    status: 'done',
                    url
                } as UploadFile))
            );
        }
        
        if (initialValues?.marketplaces) {
            setSelectedMarketplaces(initialValues.marketplaces);
        }
    }, []);

    useEffect(() => {
        if (selectedMarketplaces.includes('etsy') && etsyShippingProfiles.length === 0) {
            fetchEtsyProfiles();
        }
    }, [selectedMarketplaces]);

    const fetchEtsyProfiles = async () => {
        setFetchingEtsyProfiles(true);
        try {
            const [shippingRes, returnRes, readinessRes] = await Promise.all([
                client.get('/integrations/etsy/shipping-profiles'),
                client.get('/integrations/etsy/return-policies'),
                client.get('/integrations/etsy/readiness-states')
            ]);
            setEtsyShippingProfiles(shippingRes.data.results || []);
            setEtsyReturnPolicies(returnRes.data.results || []);
            setEtsyReadinessStates(readinessRes.data.results || []);
        } catch (error) {
            message.error('Etsy profil verileri alınamadı');
        } finally {
            setFetchingEtsyProfiles(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const { data } = await client.get('/categories');
            setCategories(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch categories:', error);
        }
    };

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

    // Convert a File object to a base64 data URL string
    const convertToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
        });
    };

    const calculateLivePrice = useCallback((gramWeight?: number, milyem?: number, effectiveMilyem?: number, profitMargin?: number, b2bDiscount?: number) => {
        const gw = gramWeight || 0;
        const ml = milyem || 0;
        const em = (effectiveMilyem && effectiveMilyem >= ml) ? effectiveMilyem : ml;
        const pm = profitMargin || 0;
        const bd = b2bDiscount || 0;

        if (gw > 0) {
            setGramHas(Math.round(gw * (em / 1000) * 10000) / 10000);
        }

        if (isCloned) {
            const initialMargin = initialValues?.profitMargin || 0;
            const initialPriceTRY = initialValues?.priceTRY || 0;
            const b2bCost = initialPriceTRY / (1 + initialMargin / 100);
            const tl = b2bCost * (1 + pm / 100);
            const usd = tl / usdTryRate;
            setPriceTRY(Math.round(tl * 100) / 100);
            setPriceUSD(Math.round(usd * 100) / 100);
            setB2bPrice(0);
        } else if (gw > 0 && em > 0 && gold24KGramTRY > 0) {
            const materialCost = gw * (em / 1000) * gold24KGramTRY;
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
    }, [gold24KGramTRY, usdTryRate, isCloned, initialValues]);

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

            // Convert selected images to base64
            const rawImageFiles = fileList
                .map(f => f.originFileObj)
                .filter((f): f is RcFile => !!f);
            const base64Images: string[] = await Promise.all(rawImageFiles.map(convertToBase64));
            // Include existing images (already URLs when editing)
            const existingUrls = fileList.filter(f => f.url && !f.originFileObj).map(f => f.url as string);
            const allImages = [...existingUrls, ...base64Images];

            // Convert video if selected
            const rawVideoFiles = videoFile.map(f => f.originFileObj).filter((f): f is RcFile => !!f);
            const base64Videos: string[] = await Promise.all(rawVideoFiles.map(convertToBase64));

            await createProduct({
                ...values,
                profitMargin: values.profitMargin || 0,
                quantity: Number(values.quantity || 0),
                tags,
                images: allImages,
                videos: base64Videos,
                marketplaces: values.marketplaces || ['golden'],
                marketplaceConfig: values.marketplaceConfig || {},
                isB2BEnabled,
                b2bDiscount: isB2BEnabled ? b2bDiscount : 0,
                b2bPrice: computedB2bPrice,
                hasVariants,
                variantAttributes: hasVariants ? ['Renk', 'Beden', 'Ölçü'] : [],
                variants: hasVariants ? values.variants : []
            });

            message.success('Ürün başarıyla kaydedildi!');
            form.resetFields();
            setPriceTRY(0);
            setPriceUSD(0);
            setB2bPrice(0);
            setIsB2BEnabled(false);
            setHasVariants(false);
            setTags([]);
            setFileList([]);
            setVideoFile([]);
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
                hasVariants: false,
                ...initialValues
            }}
            onFinish={onFinish}
            onValuesChange={(changed, allValues) => {
                if (changed.gramWeight !== undefined || changed.milyem !== undefined ||
                    changed.effectiveMilyem !== undefined || changed.profitMargin !== undefined || changed.b2bDiscount !== undefined || changed.hasVariants !== undefined) {
                    calculateLivePrice(allValues.gramWeight, allValues.milyem, allValues.effectiveMilyem, allValues.profitMargin, allValues.b2bDiscount);
                    if (changed.hasVariants !== undefined) {
                        setHasVariants(changed.hasVariants);
                    }
                }
                if (changed.marketplaces) {
                    setSelectedMarketplaces(changed.marketplaces);
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
                                {categories.map(c => <Option key={c.id} value={c.name}>{c.name}</Option>)}
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
                    <Col span={4}>
                        <Form.Item
                            name="milyem"
                            label={
                              <Tooltip title="Takının gerçek alaşım saflığı (333=8K, 585=14K, 750=18K, 916=22K, 999=24K)">
                                Alaşım Milyemi <InfoCircleOutlined style={{ color: '#888', fontSize: 11 }} />
                              </Tooltip>
                            }
                            rules={[{ required: true, message: 'Milyem giriniz' }]}
                        >
                            <InputNumber 
                                placeholder="Örn: 916"
                                disabled={isCloned} 
                                style={{ width: '100%' }}
                                min={1}
                                max={1000}
                                step={1}
                            />
                        </Form.Item>
                    </Col>
                    <Col span={4}>
                        <Form.Item
                            name="effectiveMilyem"
                            label={
                              <Tooltip title="İşçilik ve kâr dahil kuyumcu hesabıyla bulunan efektif saf altın milyemi. Boş bırakılırsa alaşım milyemi kullanılır.">
                                Efektif Milyem <InfoCircleOutlined style={{ color: '#d4a017', fontSize: 11 }} />
                              </Tooltip>
                            }
                        >
                            <InputNumber
                                placeholder="Örn: 980"
                                disabled={isCloned}
                                style={{ width: '100%' }}
                                min={1}
                                max={1000}
                                step={1}
                            />
                        </Form.Item>
                    </Col>
                    <Col span={4}>
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
                        {!hasVariants ? (
                        <Form.Item name="quantity" label="Stok Adedi" rules={[{ required: true }]}>
                            <InputNumber style={{ width: '100%' }} min={0} placeholder="0" disabled={isCloned} />
                        </Form.Item>
                        ) : (
                           <div style={{ marginTop: '30px', fontWeight: 'bold' }}>Stok varyasyonlardan hesaplanacak</div>
                        )}
                    </Col>
                    <Col span={6}>
                        <Form.Item label="Gram Has (Has Altın Eşdeğeri)">
                            <div style={{ background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 6, padding: '8px 12px', textAlign: 'center' }}>
                                <span style={{ fontSize: 18, fontWeight: 700, color: '#d4a017' }}>
                                    {gramHas > 0 ? gramHas.toLocaleString('tr-TR', { minimumFractionDigits: 4, maximumFractionDigits: 4 }) : '—'}
                                </span>
                                <span style={{ fontSize: 12, color: '#888', marginLeft: 4 }}>gr has</span>
                            </div>
                        </Form.Item>
                    </Col>
                </Row>

                <Divider style={{ margin: '12px 0' }} />

                {/* Varyasyonlar (Variants) */}
                <div style={{ background: '#f5f5f5', border: '1px solid #d9d9d9', borderRadius: 8, padding: '12px 16px', marginBottom: 12 }}>
                    <Form.Item name="hasVariants" valuePropName="checked" style={{ marginBottom: 0 }}>
                        <Checkbox disabled={isCloned} style={{ fontWeight: 600 }}>
                            🎨 Farklı Varyasyonlara Sahip (Örn: Ölçü, Renk vb.)
                        </Checkbox>
                    </Form.Item>
                    
                    {hasVariants && (
                        <div style={{ marginTop: 16 }}>
                            <Form.List name="variants">
                                {(fields, { add, remove }) => (
                                    <>
                                        {fields.map(({ key, name, ...restField }) => (
                                            <div key={key} style={{ display: 'flex', gap: 16, marginBottom: 8, alignItems: 'flex-start', background: '#fff', padding: 12, borderRadius: 4, border: '1px solid #e8e8e8' }}>
                                                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                                                    <Form.Item {...restField} name={[name, 'attributes', 'Ölçü']} label="Ölçü / Beden" style={{ marginBottom: 0 }}>
                                                        <Input placeholder="Örn: 18 cm" disabled={isCloned} />
                                                    </Form.Item>
                                                    <Form.Item {...restField} name={[name, 'attributes', 'Renk']} label="Renk" style={{ marginBottom: 0 }}>
                                                        <Input placeholder="Örn: Rose Gold" disabled={isCloned} />
                                                    </Form.Item>
                                                    <Form.Item {...restField} name={[name, 'gramWeight']} label="Gram (Farklıysa)" style={{ marginBottom: 0 }}>
                                                        <InputNumber style={{ width: '100%' }} min={0.01} step={0.01} placeholder="Ana gram (Boş bırakınız)" disabled={isCloned} />
                                                    </Form.Item>
                                                    <Form.Item {...restField} name={[name, 'quantity']} label="Varyasyon Stoğu" rules={[{ required: true, message: 'Zorunlu' }]} style={{ marginBottom: 0 }}>
                                                        <InputNumber style={{ width: '100%' }} min={0} placeholder="Adet" disabled={isCloned} />
                                                    </Form.Item>
                                                    <Form.Item {...restField} name={[name, 'sku']} label="Varyasyon SKU" style={{ marginBottom: 0 }}>
                                                        <Input placeholder="Opsiyonel (Örn: SKU-18)" disabled={isCloned} />
                                                    </Form.Item>
                                                </div>
                                                <MinusCircleOutlined onClick={() => !isCloned && remove(name)} style={{ color: 'red', marginTop: 40, cursor: isCloned ? 'not-allowed' : 'pointer', fontSize: 20 }} />
                                            </div>
                                        ))}
                                        <Form.Item style={{ marginTop: 16, marginBottom: 0 }}>
                                            <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />} disabled={isCloned || fields.length >= 3}>
                                                Yeni Varyasyon Ekle (Maksimum 3)
                                            </Button>
                                        </Form.Item>
                                    </>
                                )}
                            </Form.List>
                        </div>
                    )}
                </div>

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
                    <Upload
                        disabled={isCloned}
                        listType="picture-card"
                        maxCount={6}
                        fileList={fileList}
                        beforeUpload={() => false}
                        accept="image/*"
                        onChange={({ fileList: newList }: UploadChangeParam) => setFileList(newList)}
                    >
                        {fileList.length < 6 && (
                            <div>
                                <PlusOutlined />
                                <div style={{ marginTop: 8 }}>Yükle</div>
                            </div>
                        )}
                    </Upload>
                </Form.Item>

                <Form.Item label="Ürün Videosu">
                    <Upload
                        disabled={isCloned}
                        maxCount={1}
                        fileList={videoFile}
                        beforeUpload={() => false}
                        accept="video/*"
                        onChange={({ fileList: newList }: UploadChangeParam) => setVideoFile(newList)}
                    >
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

                {selectedMarketplaces.includes('etsy') && (
                    <Card size="small" style={{ marginBottom: 12, border: '1px solid #F56400', background: '#fff9f5' }} title={<span style={{ color: '#F56400' }}>Etsy Ürün Ayarları (Zorunlu)</span>}>
                        <Form.Item 
                            name={['marketplaceConfig', 'etsy', 'shippingProfileId']} 
                            label="Etsy Nakliye Profili (Shipping Profile)"
                            rules={[{ required: true, message: 'Lütfen bir kargo profili seçin' }]}
                        >
                            <Select
                                placeholder="Etsy Kargo Profilinizi Seçin"
                                loading={fetchingEtsyProfiles}
                                options={etsyShippingProfiles.map(p => ({
                                    label: `${Math.floor(p.shipping_profile_id)} - ${p.title}`,
                                    value: p.shipping_profile_id
                                }))}
                            />
                        </Form.Item>
                        <Form.Item 
                            name={['marketplaceConfig', 'etsy', 'returnPolicyId']} 
                            label="Etsy İade Politikası (Return Policy)"
                            rules={[{ required: true, message: 'Lütfen bir iade politikası seçin' }]}
                        >
                            <Select
                                placeholder="Etsy İade Politikanızı Seçin"
                                loading={fetchingEtsyProfiles}
                                options={etsyReturnPolicies.map(p => ({
                                    label: `${Math.floor(p.return_policy_id)} - ${p.title}`,
                                    value: p.return_policy_id
                                }))}
                            />
                        </Form.Item>
                        <Form.Item 
                            name={['marketplaceConfig', 'etsy', 'readinessStateId']} 
                            label="Etsy Hazırlık Süresi (Readiness State)"
                            rules={[{ required: true, message: 'Lütfen bir hazırlık profili seçin' }]}
                            style={{ marginBottom: 0 }}
                        >
                            <Select
                                placeholder="Etsy Hazırlık Zamanı (Processing Profile) Seçin"
                                loading={fetchingEtsyProfiles}
                                options={etsyReadinessStates.map(p => ({
                                    label: `${Math.floor(p.readiness_state_id)} - ${p.name || 'Özel Süre'}`,
                                    value: p.readiness_state_id
                                }))}
                            />
                        </Form.Item>
                        <Text type="secondary" style={{ fontSize: '12px', marginTop: 4, display: 'block' }}>Etsy API'den eşzamanlı çekildi.</Text>
                    </Card>
                )}
                
                <div style={{ padding: '8px 12px', background: '#f0f2f5', borderRadius: 4 }}>
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
