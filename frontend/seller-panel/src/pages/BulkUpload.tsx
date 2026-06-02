import React, { useState } from 'react';
import { Typography, Card, Upload, Button, message, Steps, Select, Checkbox, Space, Alert } from 'antd';
import { InboxOutlined, UploadOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Paragraph } = Typography;
const { Dragger } = Upload;
const { Step } = Steps;

interface Mapping {
    [key: string]: string; // product field -> file column header
}

const REQUIRED_FIELDS = [
    { key: 'title', label: 'Ürün Başlığı (Zorunlu)' },
    { key: 'sku', label: 'Stok Kodu (SKU)' },
    { key: 'category', label: 'Kategori' },
    { key: 'milyem', label: 'Milyem / Ayar (Zorunlu, Örn: 585)' },
    { key: 'gramWeight', label: 'Gram (Zorunlu)' },
    { key: 'effectiveMilyem', label: 'Efektif Milyem (İşçilik Dahil)' },
    { key: 'profitMargin', label: 'Kâr Marjı (%)' },
    { key: 'priceMultiplier', label: 'Fiyat Çarpanı' },
    { key: 'quantity', label: 'Stok Miktarı' },
    { key: 'description', label: 'Açıklama' },
    { key: 'b2bDiscount', label: 'B2B İskonto (%)' },
    { key: 'tags', label: 'Etiketler (Virgülle Ayrılmış)' },
];

const BulkUpload: React.FC = () => {
    const [currentStep, setCurrentStep] = useState(0);
    const [uploading, setUploading] = useState(false);
    const [parsedData, setParsedData] = useState<{ headers: string[], rawData: any[], sampleData: any[] } | null>(null);
    const [mapping, setMapping] = useState<Mapping>({});
    const [isB2BEnabled, setIsB2BEnabled] = useState(false);
    const navigate = useNavigate();

    const handleUpload = (options: any) => {
        const { file, onSuccess, onError } = options;
        const formData = new FormData();
        formData.append('file', file);

        setUploading(true);
        const token = localStorage.getItem('token');
        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/products/bulk-parse`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData,
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setParsedData(data);
                    onSuccess("Ok");
                    message.success('Dosya başarıyla okundu. Lütfen sütunları eşleştirin.');
                    setCurrentStep(1);
                    
                    // Auto-map logic attempt
                    const autoMapped: Mapping = {};
                    data.headers.forEach((h: string) => {
                        const hLower = h.toLowerCase();
                        REQUIRED_FIELDS.forEach(f => {
                            if (hLower.includes(f.key) || f.label.toLowerCase().includes(hLower)) {
                                if (!autoMapped[f.key]) {
                                    autoMapped[f.key] = h;
                                }
                            }
                        });
                    });
                    setMapping(autoMapped);

                } else {
                    onError(new Error(data.error));
                    message.error(data.error || 'Dosya okunamadı');
                }
            })
            .catch(err => {
                onError(err);
                message.error('Sunucu hatası: ' + err.message);
            })
            .finally(() => {
                setUploading(false);
            });
    };

    const handleImport = async () => {
        if (!parsedData) return;
        
        // Transform based on mapping
        const mappedProducts = parsedData.rawData.map(row => {
            const productObj: any = {};
            Object.keys(mapping).forEach(fieldKey => {
                const header = mapping[fieldKey];
                if (header && row[header] !== undefined) {
                    productObj[fieldKey] = row[header];
                }
            });
            return productObj;
        });

        if (mappedProducts.length === 0) {
            return message.error('Eşleştirilmiş ürün bulunamadı.');
        }

        setUploading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/products/bulk-import`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    products: mappedProducts,
                    isB2BEnabled
                })
            });

            const data = await res.json();
            if (data.success) {
                message.success(data.message);
                setCurrentStep(2);
            } else {
                message.error(data.error || 'Aktarım hatası');
            }
        } catch (error: any) {
            message.error('Sunucu hatası: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 0' }}>
            <Title level={2}>Toplu Ürün Yükleme</Title>
            <Paragraph>
                Excel veya XML dosyalarınızı yükleyerek tek seferde yüzlerce ürünü mağazanıza aktarabilirsiniz.
                Şablon zorunluluğu yoktur; yüklediğiniz belgedeki sütunları sistem alanlarıyla eşleştirmeniz yeterlidir.
            </Paragraph>

            <Steps current={currentStep} style={{ marginBottom: 40 }}>
                <Step title="Dosya Yükle" description="Excel veya XML seçin" />
                <Step title="Sütun Eşleştir" description="Verileri tanımlayın" />
                <Step title="Sonuç" description="İşlem tamamlandı" />
            </Steps>

            {currentStep === 0 && (
                <Card>
                    <Dragger
                        customRequest={handleUpload}
                        accept=".xls,.xlsx,.csv,.xml"
                        showUploadList={false}
                    >
                        <p className="ant-upload-drag-icon">
                            <InboxOutlined />
                        </p>
                        <p className="ant-upload-text">Dosyayı buraya tıklayın ya da sürükleyip bırakın</p>
                        <p className="ant-upload-hint">
                            Sadece tek dosya yüklemesi desteklenir. (.xlsx, .xls, .csv, .xml)
                        </p>
                    </Dragger>
                </Card>
            )}

            {currentStep === 1 && parsedData && (
                <Card title="Sütunları Eşleştir">
                    <Alert
                        message="Lütfen yüklediğiniz dosyadaki karşılık gelen sütunları seçin. Eşleştirilmeyen alanlar varsayılan değerler alır veya boş bırakılır."
                        type="info"
                        showIcon
                        style={{ marginBottom: 24 }}
                    />
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
                        {REQUIRED_FIELDS.map(field => (
                            <div key={field.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid #f0f0f0' }}>
                                <div style={{ fontWeight: 500, width: 250 }}>{field.label}</div>
                                <Select
                                    style={{ flex: 1, maxWidth: 400 }}
                                    allowClear
                                    placeholder="Dosyadaki Sütun Seçin"
                                    value={mapping[field.key]}
                                    onChange={(val) => setMapping(prev => ({ ...prev, [field.key]: val }))}
                                >
                                    {parsedData.headers.map(h => (
                                        <Select.Option key={h} value={h}>{h}</Select.Option>
                                    ))}
                                </Select>
                            </div>
                        ))}
                    </div>

                    <div style={{ padding: '16px 0', borderTop: '2px dashed #f0f0f0', marginBottom: 24 }}>
                        <Checkbox 
                            checked={isB2BEnabled} 
                            onChange={(e) => setIsB2BEnabled(e.target.checked)}
                        >
                            Bu ürünler B2B Pazaryeri'ne de (Toptan Satışa) eklensin
                        </Checkbox>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Button onClick={() => setCurrentStep(0)}>Geri Dön</Button>
                        <Button type="primary" onClick={handleImport} loading={uploading} size="large" icon={<UploadOutlined />}>
                            İçe Aktar ({parsedData.rawData.length} Ürün)
                        </Button>
                    </div>
                </Card>
            )}

            {currentStep === 2 && (
                <Card style={{ textAlign: 'center', padding: '50px 0' }}>
                    <CheckCircleOutlined style={{ fontSize: 64, color: '#52c41a', marginBottom: 24 }} />
                    <Title level={3}>Ürünler Başarıyla İçe Aktarıldı!</Title>
                    <Paragraph>
                        Eşleştirilen tüm ürünler veritabanına eklendi ve hesaplamaları başlatıldı. Yüklenen ürünler birkaç dakika içinde ürünler sayfanızda görünecektir.
                    </Paragraph>
                    <Space size="large" style={{ marginTop: 24 }}>
                        <Button size="large" onClick={() => {
                            setParsedData(null);
                            setMapping({});
                            setCurrentStep(0);
                        }}>Yeni Dosya Yükle</Button>
                        <Button type="primary" size="large" onClick={() => navigate('/products')}>Ürünlere Git</Button>
                    </Space>
                </Card>
            )}
        </div>
    );
};

export default BulkUpload;
