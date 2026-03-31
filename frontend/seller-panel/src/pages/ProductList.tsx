
import React, { useEffect, useState } from 'react';
import { Table, Button, Space, message, Modal, Tabs, Tag, Switch, Statistic, Card, Row, Col, Typography } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, SyncOutlined, DollarOutlined, GoldOutlined } from '@ant-design/icons';
import { getProducts, deleteProduct, getAutoSyncStatus, setAutoSyncStatus, triggerManualSync, Product } from '../api/product';
import client from '../api/client';
import AddProduct from './AddProduct';

const { Text } = Typography;

const ProductList: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [autoSync, setAutoSync] = useState(true);
    const [goldPrice, setGoldPrice] = useState<any>(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    useEffect(() => {
        fetchProducts();
        fetchGoldPrice();
        fetchSyncStatus();
    }, []);

    const fetchGoldPrice = async () => {
        try {
            const res = await client.get('/gold-price/current');
            setGoldPrice(res.data);
        } catch (error) {
            console.error('Failed to fetch gold price', error);
        }
    };

    const fetchSyncStatus = async () => {
        try {
            const status = await getAutoSyncStatus();
            setAutoSync(!!status);
        } catch (error) {
            console.error('Failed to fetch sync status', error);
        }
    };

    const handleSyncStatusChange = async (checked: boolean) => {
        try {
            await setAutoSyncStatus(checked);
            setAutoSync(checked);
            message.success(checked ? 'Otomatik senkronizasyon açıldı.' : 'Otomatik senkronizasyon kapatıldı.');
        } catch (error) {
            message.error('Ayar güncellenemedi.');
        }
    };

    const handleManualSync = async () => {
        setSyncing(true);
        try {
            const res = await triggerManualSync();
            message.success(res.message || 'Fiyatlar başarıyla senkronize edildi.');
            fetchProducts();
        } catch (error) {
            message.error('Senkronizasyon sırasında hata oluştu.');
        } finally {
            setSyncing(false);
        }
    };

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const data = await getProducts();
            // data might be array or { data: [] } depending on backend response format
            // In productController: res.status(200).json({ data: rows, pagination: ... })
            // In getProducts: return response.data.data
            // So data is array.
            setProducts(data || []);
        } catch (error) {
            console.error(error);
            message.error('Ürünler yüklenirken hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteProduct(id);
            message.success('Ürün silindi.');
            fetchProducts();
        } catch (error) {
            message.error('Silme işlemi başarısız.');
        }
    };

    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        setIsModalVisible(true);
    };

    const handleAdd = () => {
        setEditingProduct(null);
        setIsModalVisible(true);
    };

    const handleModalClose = (refresh: boolean) => {
        setIsModalVisible(false);
        if (refresh) fetchProducts();
    };

    const columns = [
        { title: 'Resim', dataIndex: 'images', key: 'images', render: (imgs: string[]) => imgs && imgs.length > 0 ? <img src={imgs[0]} alt="product" style={{ width: 50 }} /> : 'Yok' },
        { 
            title: 'Ürün Adı', 
            dataIndex: 'title', 
            key: 'title',
            render: (text: string, record: Product) => (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span>{text}</span>
                    {record.originalStoreName && (
                        <span style={{
                            fontSize: 10,
                            padding: '2px 6px',
                            background: '#fff2e8',
                            color: '#d4380d',
                            border: '1px solid #ffbb96',
                            borderRadius: 4,
                            marginTop: 4,
                            display: 'inline-block',
                            width: 'fit-content'
                        }}>TEDARİK: {record.originalStoreName}</span>
                    )}
                </div>
            )
        },
        { title: 'Kategori', dataIndex: 'category', key: 'category' },
        { title: 'Gram', dataIndex: 'gramWeight', key: 'gramWeight', render: (val: number) => `${val} gr` },
        { 
            title: 'Milyem', 
            key: 'milyem',
            render: (_: any, record: Product) => (
                <div style={{ lineHeight: 1.4 }}>
                    <div><span style={{ color: '#666', fontSize: 11 }}>Alaşım: </span><strong>{record.milyem}</strong></div>
                    {record.effectiveMilyem && record.effectiveMilyem !== record.milyem && (
                        <div><span style={{ color: '#d4a017', fontSize: 11 }}>Efektif: </span><strong style={{ color: '#d4a017' }}>{record.effectiveMilyem}</strong></div>
                    )}
                </div>
            )
        },
        { 
            title: 'Gram Has', 
            dataIndex: 'gramHas', 
            key: 'gramHas',
            render: (val: number) => val ? (
                <span style={{ color: '#d4a017', fontWeight: 600 }}>
                    {Number(val).toLocaleString('tr-TR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} gr has
                </span>
            ) : '—'
        },
        { title: 'Fiyat (TL)', dataIndex: 'priceTRY', key: 'priceTRY', render: (val: number) => `${Number(val).toLocaleString('tr-TR')} ₺` },
        { title: 'Miktar', dataIndex: 'quantity', key: 'quantity' },
        {
            title: 'İşlemler',
            key: 'actions',
            render: (_: any, record: Product) => (
                <Space>
                    <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} />
                    <Button icon={<DeleteOutlined />} danger onClick={() => handleDelete(record.id)} />
                </Space>
            )
        }
    ];

    const myProducts = products.filter(p => !p.originalProductId && !p.originalStoreName);
    const b2bProducts = products.filter(p => p.originalProductId || p.originalStoreName);

    const tableProps = (data: Product[]) => ({
        dataSource: data,
        columns: columns,
        rowKey: "id",
        loading: loading,
        pagination: { pageSize: 15 }
    });

    const tabItems = [
        {
            key: 'my-products',
            label: `Kendi Ürünlerim (${myProducts.length})`,
            children: <Table {...tableProps(myProducts)} />
        },
        {
            key: 'b2b-products',
            label: (
                <span>
                    Tedarik Edilenler (B2B)
                    <Tag color="orange" style={{ marginLeft: 8, borderRadius: 10 }}>{b2bProducts.length}</Tag>
                </span>
            ),
            children: <Table {...tableProps(b2bProducts)} />
        }
    ];

    return (
        <div>
            {/* Header Area with Gold Rates and Sync Settings */}
            <Row gutter={[16, 16]} style={{ marginBottom: 20 }} align="middle">
                <Col span={8}>
                    <h2>Ürünlerim</h2>
                </Col>
                <Col span={16} style={{ textAlign: 'right' }}>
                    <Space size="large" align="center">
                        {goldPrice && (
                            <Space size="middle">
                                <Tag color="gold" style={{ padding: '4px 10px', fontSize: 13, border: '1px solid #d4a017', background: '#fffbe6' }}>
                                    <GoldOutlined style={{ marginRight: 6 }} />
                                    24K Gram Has: <strong>{Number(goldPrice.pricePerGramTRY).toLocaleString('tr-TR')} ₺</strong>
                                </Tag>
                                <Tag color="blue" style={{ padding: '4px 10px', fontSize: 13, border: '1px solid #91d5ff', background: '#e6f7ff' }}>
                                    <DollarOutlined style={{ marginRight: 6 }} />
                                    USD/TRY: <strong>{Number(goldPrice.usdTryRate).toLocaleString('tr-TR')} ₺</strong>
                                </Tag>
                            </Space>
                        )}
                        
                        <div style={{ display: 'flex', alignItems: 'center', background: '#f5f5f5', padding: '6px 12px', borderRadius: 6, border: '1px solid #d9d9d9' }}>
                            <Text style={{ marginRight: 8, fontSize: 12 }}>Oto-Fiyat Senkronu:</Text>
                            <Switch 
                                checked={autoSync} 
                                onChange={handleSyncStatusChange} 
                                checkedChildren="Açık" 
                                unCheckedChildren="Kapalı"
                                size="small"
                                style={{ background: autoSync ? '#52c41a' : undefined }}
                            />
                        </div>

                        <Button type="default" icon={<SyncOutlined spin={syncing} />} onClick={handleManualSync} loading={syncing}>
                            Fiyatları Senkronize Et
                        </Button>
                        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                            Yeni Ürün Ekle
                        </Button>
                    </Space>
                </Col>
            </Row>

            <Tabs defaultActiveKey="my-products" items={tabItems} />

            <Modal
                title={editingProduct ? "Ürün Düzenle" : "Yeni Ürün Ekle"}
                visible={isModalVisible}
                onCancel={() => handleModalClose(false)}
                footer={null}
                destroyOnClose
            >
                <AddProduct
                    initialValues={editingProduct}
                    onSuccess={() => handleModalClose(true)}
                />
            </Modal>
        </div>
    );
};

export default ProductList;
