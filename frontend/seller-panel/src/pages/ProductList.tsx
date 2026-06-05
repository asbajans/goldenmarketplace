
import React, { useEffect, useState } from 'react';
import { Table, Button, Space, message, Modal, Tabs, Tag, Switch, Typography, Input, Checkbox, Row, Col, Tooltip, Select } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, SyncOutlined, DollarOutlined, GoldOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { deleteProduct, getAutoSyncStatus, setAutoSyncStatus, triggerManualSync, Product } from '../api/product';
import { bulkAITranslate, cleanupDescriptions } from '../api/ai';
import client from '../api/client';
import AddProduct from './AddProduct';
import AITaskProgress from './AITaskProgress';

const { Text } = Typography;

const ProductList: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [autoSync, setAutoSync] = useState(true);
    const [goldPrice, setGoldPrice] = useState<any>(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMarketplaces, setSelectedMarketplaces] = useState<string[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [translateLoading, setTranslateLoading] = useState(false);
    const [aiProgressVisible, setAiProgressVisible] = useState(false);
    const [cleanupModalOpen, setCleanupModalOpen] = useState(false);
    const [cleanupKeyword, setCleanupKeyword] = useState('');
    const [cleanupAction, setCleanupAction] = useState<'clear_matching' | 'clear_all'>('clear_matching');
    const [cleanupLoading, setCleanupLoading] = useState(false);

    useEffect(() => {
        fetchProducts(searchTerm, selectedMarketplaces);
        fetchGoldPrice();
        fetchSyncStatus();
    }, [searchTerm, selectedMarketplaces]);

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

    const fetchProducts = async (search?: string, marketplaces?: string[]) => {
        setLoading(true);
        try {
            const marketplaceParams = marketplaces && marketplaces.length > 0 ? marketplaces : undefined;
            const response = await client.get('/products', {
                params: { limit: 100, search, marketplaces: marketplaceParams?.join(',') }
            });
            const data = response.data?.data || [];
            const pagination = response.data?.pagination;
            setProducts(data);
            if (pagination?.total !== undefined) {
                setTotalCount(pagination.total);
            }
        } catch (error) {
            console.error(error);
            message.error('Ürünler yüklenirken hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, title: string) => {
        Modal.confirm({
            title: 'Ürünü Sil',
            content: (
                <div>
                    <p>"{title}" ürününü silmek istediğinize emin misiniz?</p>
                    <p style={{ color: '#ff4d4f', fontWeight: 600 }}>Bu işlem geri alınamaz.</p>
                </div>
            ),
            okText: 'Evet, Sil',
            okType: 'danger',
            cancelText: 'İptal',
            onOk: async () => {
                try {
                    await deleteProduct(id);
                    message.success('Ürün silindi.');
                    fetchProducts();
                } catch (error) {
                    message.error('Silme işlemi başarısız.');
                }
            }
        });
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

    const handleBulkTranslate = async () => {
        if (selectedRowKeys.length === 0) {
            message.warning('Lütfen çevrilecek ürünleri seçin.');
            return;
        }
        setTranslateLoading(true);
        try {
            const ids = selectedRowKeys.map(k => String(k));
            const res = await bulkAITranslate(ids, 'translate');
            message.success(res.message || `${ids.length} ürün çeviri kuyruğuna alındı`);
            setAiProgressVisible(true);
            setSelectedRowKeys([]);
        } catch (err: any) {
            message.error(err?.response?.data?.error || 'Toplu çeviri başlatılamadı');
        } finally {
            setTranslateLoading(false);
        }
    };

    const handleCleanup = async () => {
        if (cleanupAction === 'clear_matching' && !cleanupKeyword.trim()) {
            message.warning('Lütfen temizlenecek kelimeyi girin.');
            return;
        }
        setCleanupLoading(true);
        try {
            const res = await cleanupDescriptions(cleanupKeyword.trim(), cleanupAction);
            message.success(res.message || `${res.cleaned} ürün temizlendi`);
            setCleanupModalOpen(false);
            setCleanupKeyword('');
            fetchProducts();
        } catch (err: any) {
            message.error(err?.response?.data?.error || 'Temizleme başarısız');
        } finally {
            setCleanupLoading(false);
        }
    };

    const rowSelection = {
        selectedRowKeys,
        onChange: (newKeys: React.Key[]) => setSelectedRowKeys(newKeys),
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
                    <Button icon={<DeleteOutlined />} danger onClick={() => handleDelete(record.id, record.title)} />
                </Space>
            )
        }
    ];

    // Original classification remains for tabs
    const myProducts = products.filter(p => !p.originalProductId && !p.originalStoreName);
    const b2bProducts = products.filter(p => p.originalProductId || p.originalStoreName);

    const tableProps = (data: Product[]) => ({
        dataSource: data,
        columns: columns,
        rowKey: "id",
        loading: loading,
        pagination: { pageSize: 15 },
        rowSelection
    });

    const tabItems = [
        {
            key: 'my-products',
            label: `Kendi Ürünlerim (${totalCount})`,
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
             {/* Header Area with Gold Rates, Sync Settings, Search and Filters */}
              <Row gutter={[16, 16]} style={{ marginBottom: 20 }} align="middle">
                  <Col span={8}>
                      <h2>Tüm Ürünler</h2>
                  </Col>
                  <Col span={16} style={{ textAlign: 'right' }}>
                      <Space size="large" align="center" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'flex-end' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '280px' }}>
                              {/* Search Input */}
                              <Input.Search
                                placeholder="Ürün ara..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                onPressEnter={() => fetchProducts(searchTerm, selectedMarketplaces)}
                                style={{ width: 220 }}
                              />
                              
                              {/* Marketplace Filters */}
                              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <Checkbox.Group
                                  options={[
                                    { label: 'Golden Marketplace', value: 'golden' },
                                    { label: 'Etsy', value: 'etsy' },
                                    { label: 'Trendyol', value: 'trendyol' },
                                    { label: 'Amazon', value: 'amazon' },
                                    { label: 'N11', value: 'n11' },
                                    { label: 'Hepsiburada', value: 'hepsiburada' },
                                    { label: 'Pazarama', value: 'pazarama' }
                                  ]}
                                  value={selectedMarketplaces}
                                  onChange={values => {
                                    setSelectedMarketplaces(values);
                                    fetchProducts(searchTerm, values);
                                  }}
                                />
                              </div>
                          </div>
                         
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
                           <Tooltip title={selectedRowKeys.length === 0 ? 'Önce ürünleri seçin' : ''}>
                               <Button
                                   type="default"
                                   icon={<ThunderboltOutlined />}
                                   onClick={handleBulkTranslate}
                                   loading={translateLoading}
                                   disabled={selectedRowKeys.length === 0}
                                   style={{ borderColor: '#722ed1', color: '#722ed1' }}
                               >
                                   AI ile Çevir ({selectedRowKeys.length})
                               </Button>
                           </Tooltip>
                           <Button
                               type="default"
                               onClick={() => setCleanupModalOpen(true)}
                               style={{ borderColor: '#ff4d4f', color: '#ff4d4f' }}
                           >
                               Açıklamaları Temizle
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
                open={isModalVisible}
                onCancel={() => handleModalClose(false)}
                footer={null}
                destroyOnClose
            >
                <AddProduct
                    initialValues={editingProduct}
                    onSuccess={() => handleModalClose(true)}
                />
            </Modal>

            <Modal
                title="Açıklamaları Temizle"
                open={cleanupModalOpen}
                onCancel={() => { setCleanupModalOpen(false); setCleanupKeyword(''); }}
                onOk={handleCleanup}
                confirmLoading={cleanupLoading}
                okText="Temizle"
                okButtonProps={{ danger: true }}
            >
                <div style={{ marginBottom: 16 }}>
                    <Text>Bu işlem ürün açıklamalarını kalıcı olarak temizler.</Text>
                </div>
                <div style={{ marginBottom: 12 }}>
                    <Text strong>Eylem</Text>
                    <Select
                        value={cleanupAction}
                        onChange={v => setCleanupAction(v)}
                        style={{ width: '100%', marginTop: 4 }}
                        options={[
                            { label: 'Kelime/ifade içerenleri temizle', value: 'clear_matching' },
                            { label: 'Tüm ürünlerin açıklamalarını temizle', value: 'clear_all' }
                        ]}
                    />
                </div>
                {cleanupAction === 'clear_matching' && (
                    <div>
                        <Text strong>Temizlenecek kelime veya cümle</Text>
                        <Input
                            value={cleanupKeyword}
                            onChange={e => setCleanupKeyword(e.target.value)}
                            placeholder="Örn: &amp;amp;lt;, gratis, ürün açıklaması"
                            style={{ marginTop: 4 }}
                        />
                    </div>
                )}
            </Modal>

            <AITaskProgress
                visible={aiProgressVisible}
                onClose={() => setAiProgressVisible(false)}
                onAllComplete={() => {
                    message.success('Tüm AI işlemleri tamamlandı!');
                    setAiProgressVisible(false);
                    fetchProducts();
                }}
            />
        </div>
    );
};

export default ProductList;
