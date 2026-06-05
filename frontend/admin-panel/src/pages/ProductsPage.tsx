import React, { useEffect, useState } from 'react';
import { Table, Card, Button, Modal, Form, Input, InputNumber, Switch, Select, message, Tag, Space } from 'antd';
import { EditOutlined, SearchOutlined } from '@ant-design/icons';
import { AdminAPI } from '../services/api';

export const ProductsPage: React.FC = () => {
    const [products, setProducts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [pagination, setPagination] = useState({ current: 1, pageSize: 50, total: 0 });
    
    // Edit Modal State
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [editingProduct, setEditingProduct] = useState<any>(null);
    const [form] = Form.useForm();

    const fetchProducts = async (page = 1, search = '') => {
        setLoading(true);
        try {
            const res = await AdminAPI.getAllProducts({ page, limit: 50, search: search || undefined });
            setProducts(res.data || []);
            if (res.pagination) {
                setPagination(p => ({ ...p, current: page, total: res.pagination.total }));
            }
        } catch (error) {
            message.error('Ürünler yüklenemedi');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
        AdminAPI.getCategories().then(setCategories).catch(() => {});
    }, []);

    const handleEdit = (record: any) => {
        setEditingProduct(record);
        const catId = record.categoryId ||
            categories.find(c =>
                c.name === record.category ||
                c.slug === record.category
            )?.id || null;
        form.setFieldsValue({
            title: record.title,
            categoryId: catId,
            category: record.category,
            gramWeight: record.gramWeight,
            milyem: record.milyem,
            effectiveMilyem: record.effectiveMilyem,
            profitMargin: record.profitMargin,
            isB2BEnabled: record.isB2BEnabled,
            b2bDiscount: record.b2bDiscount,
            isActive: record.isActive,
            quantity: record.quantity
        });
        setIsEditModalVisible(true);
    };

    const handleEditSubmit = async (values: any) => {
        if (!editingProduct) return;
        try {
            await AdminAPI.updateProduct(editingProduct.id, values);
            message.success('Ürün başarıyla güncellendi');
            setIsEditModalVisible(false);
            fetchProducts(pagination.current, searchText);
        } catch (error) {
            message.error('Ürün güncellenemedi');
        }
    };

    // Search with debounce
    const handleSearch = (value: string) => {
        setSearchText(value);
        setPagination(p => ({ ...p, current: 1 }));
        fetchProducts(1, value);
    };

    // Server-side filter already applied; keep local filter as fallback for display
    const filteredProducts = products;

    const columns = [
        { title: 'SKU / Kod', dataIndex: 'sku', key: 'sku', width: 120 },
        { title: 'Ürün Adı', dataIndex: 'title', key: 'title' },
        { title: 'Kategori', dataIndex: 'category', key: 'category', width: 120 },
        { title: 'Mağaza', key: 'store', render: (_: any, record: any) => record.store?.storeName || record.store?.name || 'Bilinmiyor' },
        { title: 'Gram', dataIndex: 'gramWeight', key: 'gramWeight', render: (val: number) => `${val} gr` },
        { 
            title: 'Milyem', 
            key: 'milyem', 
            render: (_: any, record: any) => (
                <Space direction="vertical" size="small" style={{ lineHeight: '1.2' }}>
                    <span style={{ fontSize: 12 }}>Alaşım: <b>{record.milyem}</b></span>
                    {record.effectiveMilyem && <span style={{ fontSize: 12, color: '#d4a017' }}>Efektif: <b>{record.effectiveMilyem}</b></span>}
                </Space>
            )
        },
        { title: 'Fiyat (TL)', dataIndex: 'priceTRY', key: 'priceTRY', render: (val: number) => <span style={{ fontWeight: 600 }}>{val ? val.toLocaleString('tr-TR') : '0'} ₺</span> },
        { 
            title: 'B2B', 
            key: 'b2b', 
            render: (_: any, record: any) => record.isB2BEnabled ? (
                <Tag color="green">B2B Aktif (%{record.b2bDiscount})</Tag>
            ) : <Tag color="default">Kapalı</Tag>
        },
        {
            title: 'Durum',
            dataIndex: 'isActive',
            key: 'isActive',
            render: (isActive: boolean) => <Tag color={isActive ? 'success' : 'error'}>{isActive ? 'Aktif' : 'Pasif'}</Tag>
        },
        {
            title: 'İşlem',
            key: 'actions',
            render: (_: any, record: any) => (
                <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>Gelişmiş Düzenle</Button>
            )
        }
    ];

    return (
        <Card title="Tüm Mağazaların Ürünleri" extra={
            <Input 
                placeholder="Ürün, SKU veya Mağaza ara..." 
                prefix={<SearchOutlined />} 
                onChange={e => handleSearch(e.target.value)}
                allowClear
                style={{ width: 250 }}
            />
        }>
            <Table
                dataSource={filteredProducts}
                columns={columns}
                rowKey="id"
                loading={loading}
                pagination={{
                    current: pagination.current,
                    pageSize: pagination.pageSize,
                    total: pagination.total,
                    showTotal: (total: number) => `Toplam ${total} ürün`,
                    onChange: (page: number) => fetchProducts(page, searchText),
                    showSizeChanger: false
                }}
                scroll={{ x: 'max-content' }}
                size="small"
            />

            <Modal
                title={`Ürün Düzenle: ${editingProduct?.title}`}
                open={isEditModalVisible}
                onCancel={() => setIsEditModalVisible(false)}
                onOk={() => form.submit()}
                width={700}
                okText="Kaydet"
                cancelText="İptal"
            >
                <Form form={form} layout="vertical" onFinish={handleEditSubmit}>
                    <div style={{ background: '#fffbe6', padding: '12px 16px', borderRadius: 8, marginBottom: 16, border: '1px solid #ffe58f' }}>
                        <span style={{ color: '#d48806', fontWeight: 600 }}>Admin Uyarısı:</span> Bu alanda yapılan değişiklikler doğrudan mağazanın orijinal ürün verisini değiştirir ve satıcının kilitli B2B/Klon kurallarını da aşar.
                    </div>
                    
                    <Form.Item name="title" label="Ürün Adı" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>

                    <Space size="large" style={{ display: 'flex', marginBottom: 8 }}>
                        <Form.Item name="categoryId" label="Kategori" rules={[{ required: true }]}>
                            <Select
                                style={{ width: 200 }}
                                placeholder="Kategori Seçin"
                                showSearch
                                optionFilterProp="label"
                                onChange={(val: string) => {
                                    const cat = categories.find(c => c.id === val);
                                    if (cat) form.setFieldValue('category', cat.slug);
                                }}
                                options={categories.map((c: any) => ({
                                    value: c.id,
                                    label: c.name
                                }))}
                            />
                        </Form.Item>
                        <Form.Item name="quantity" label="Kalan Stok" rules={[{ required: true }]}>
                            <InputNumber min={0} style={{ width: 120 }} />
                        </Form.Item>
                        <Form.Item name="isActive" label="Aktif mi?" valuePropName="checked">
                            <Switch />
                        </Form.Item>
                    </Space>
                    <Form.Item name="category" hidden>
                        <Input />
                    </Form.Item>

                    <Card size="small" title="Fiyat & Altın Ayarları" style={{ marginBottom: 16 }}>
                        <Space size="middle" wrap>
                            <Form.Item name="gramWeight" label="Gram">
                                <InputNumber min={0.01} step={0.01} />
                            </Form.Item>
                            <Form.Item name="milyem" label="Alaşım Milyem">
                                <InputNumber min={1} max={1000} />
                            </Form.Item>
                            <Form.Item name="effectiveMilyem" label="Efektif Milyem">
                                <InputNumber min={1} max={1000} placeholder="Opsiyonel" />
                            </Form.Item>
                            <Form.Item name="profitMargin" label="Kâr Marjı (%)">
                                <InputNumber min={0} max={500} />
                            </Form.Item>
                        </Space>
                    </Card>

                    <Card size="small" title="B2B (Mağazalar Arası Satış) Ayarları">
                        <Space size="large">
                            <Form.Item name="isB2BEnabled" label="B2B Pazarına Açık" valuePropName="checked">
                                <Switch />
                            </Form.Item>
                            <Form.Item name="b2bDiscount" label="B2B İskonto (%)">
                                <InputNumber min={0} max={100} />
                            </Form.Item>
                        </Space>
                    </Card>
                </Form>
            </Modal>
        </Card>
    );
};

export default ProductsPage;
