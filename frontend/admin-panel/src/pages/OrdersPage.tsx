import React, { useState, useEffect } from 'react';
import { 
    Table, Tag, Button, Card, Space, Select, 
    Typography, Row, Col, Statistic, Modal, Tabs
} from 'antd';
import { 
    EyeOutlined
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const { Text } = Typography;
const { Option } = Select;

const api = axios.create({
    baseURL: '/api',
    headers: { 'Content-Type': 'application/json' }
});
api.interceptors.request.use((cfg) => {
    const token = localStorage.getItem('adminToken');
    if (token) cfg.headers.Authorization = `Bearer ${token}`;
    return cfg;
});

interface OrderItem {
    id: string;
    productId: string;
    title: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
}

interface Order {
    id: string;
    orderNumber: string;
    status: string;
    subtotal: number;
    shippingCost: number;
    totalAmount: number;
    commissionRate: number;
    commissionAmount: number;
    sellerEarnings: number;
    source: string;
    trackingNumber?: string;
    shippingCompany?: string;
    createdAt: string;
    store?: {
        storeName: string;
        storeSlug: string;
    };
    seller?: {
        firstName: string;
        lastName: string;
        email: string;
    };
    customer?: {
        firstName: string;
        lastName: string;
        email: string;
    };
    items: OrderItem[];
}

const statusColors: Record<string, string> = {
    pending: 'gold',
    confirmed: 'blue',
    processing: 'cyan',
    shipped: 'purple',
    delivered: 'green',
    cancelled: 'red',
    returned: 'orange'
};

const statusLabels: Record<string, string> = {
    pending: 'Bekliyor',
    confirmed: 'Onaylandı',
    processing: 'Hazırlanıyor',
    shipped: 'Kargolandı',
    delivered: 'Teslim Edildi',
    cancelled: 'İptal Edildi',
    returned: 'İade Edildi'
};

const sourceLabels: Record<string, string> = {
    golden: 'Golden',
    trendyol: 'Trendyol',
    hepsiburada: 'Hepsiburada',
    etsy: 'Etsy',
    amazon: 'Amazon',
    other: 'Diğer'
};

const OrdersPage: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [activeTab, setActiveTab] = useState('all');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [sourceFilter, setSourceFilter] = useState<string>('');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [stats, setStats] = useState({
        totalOrders: 0,
        pendingOrders: 0,
        shippedOrders: 0,
        deliveredOrders: 0,
        totalRevenue: 0,
        totalCommission: 0
    });

    useEffect(() => {
        fetchOrders();
        fetchStats();
    }, [page, pageSize, statusFilter, sourceFilter, activeTab]);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const params: any = { page, limit: pageSize };
            if (statusFilter) params.status = statusFilter;
            if (sourceFilter) params.source = sourceFilter;
            
            if (activeTab !== 'all') {
                if (activeTab === 'golden') {
                    params.source = 'golden';
                } else {
                    params.source = `!golden`;
                }
            }
            
            const res = await api.get('/admin/orders', { params });
            setOrders(res.data.orders || []);
            setTotal(res.data.total || 0);
        } catch (error: any) {
            console.error('Error fetching orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const res = await api.get('/admin/stats/orders');
            setStats(res.data);
        } catch (error: any) {
            console.error('Error fetching stats:', error);
        }
    };

    const columns = [
        {
            title: 'Sipariş No',
            dataIndex: 'orderNumber',
            key: 'orderNumber',
            render: (text: string) => <Text strong>{text}</Text>
        },
        {
            title: 'Mağaza',
            dataIndex: 'store',
            key: 'store',
            render: (store: any) => store?.storeName || '-'
        },
        {
            title: 'Satıcı',
            dataIndex: 'seller',
            key: 'seller',
            render: (seller: any) => seller ? `${seller.firstName} ${seller.lastName}` : '-'
        },
        {
            title: 'Müşteri',
            dataIndex: 'customer',
            key: 'customer',
            render: (customer: any) => customer ? `${customer.firstName} ${customer.lastName}` : '-'
        },
        {
            title: 'Durum',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => (
                <Tag color={statusColors[status]}>{statusLabels[status]}</Tag>
            )
        },
        {
            title: 'Kaynak',
            dataIndex: 'source',
            key: 'source',
            render: (source: string) => (
                <Tag color={source === 'golden' ? 'gold' : 'default'}>
                    {sourceLabels[source] || source}
                </Tag>
            )
        },
        {
            title: 'Tutar',
            dataIndex: 'totalAmount',
            key: 'totalAmount',
            render: (amount: number) => (
                <Text strong>{Number(amount).toLocaleString('tr-TR')} TL</Text>
            )
        },
        {
            title: 'Komisyon',
            dataIndex: 'commissionAmount',
            key: 'commissionAmount',
            render: (amount: number) => (
                <Text type="danger">{Number(amount).toLocaleString('tr-TR')} TL</Text>
            )
        },
        {
            title: 'Satıcı Kazancı',
            dataIndex: 'sellerEarnings',
            key: 'sellerEarnings',
            render: (amount: number) => (
                <Text type="success" style={{ color: '#52c41a' }}>
                    {Number(amount).toLocaleString('tr-TR')} TL
                </Text>
            )
        },
        {
            title: 'Tarih',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (date: string) => dayjs(date).format('DD.MM.YYYY HH:mm')
        },
        {
            title: 'İşlem',
            key: 'actions',
            render: (_: any, record: Order) => (
                <Button 
                    type="text" 
                    icon={<EyeOutlined />} 
                    onClick={() => {
                        setSelectedOrder(record);
                        setDetailModalOpen(true);
                    }}
                />
            )
        }
    ];

    return (
        <div>
            <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={4}>
                    <Card>
                        <Statistic 
                            title="Toplam Sipariş" 
                            value={stats.totalOrders} 
                        />
                    </Card>
                </Col>
                <Col span={4}>
                    <Card>
                        <Statistic 
                            title="Bekleyen" 
                            value={stats.pendingOrders} 
                            valueStyle={{ color: '#faad14' }}
                        />
                    </Card>
                </Col>
                <Col span={4}>
                    <Card>
                        <Statistic 
                            title="Kargolanmış" 
                            value={stats.shippedOrders}
                            valueStyle={{ color: '#1890ff' }}
                        />
                    </Card>
                </Col>
                <Col span={4}>
                    <Card>
                        <Statistic 
                            title="Teslim Edildi" 
                            value={stats.deliveredOrders}
                            valueStyle={{ color: '#52c41a' }}
                        />
                    </Card>
                </Col>
                <Col span={4}>
                    <Card>
                        <Statistic 
                            title="Toplam Gelir" 
                            value={Number(stats.totalRevenue || 0).toLocaleString('tr-TR')}
                            suffix="TL"
                        />
                    </Card>
                </Col>
                <Col span={4}>
                    <Card>
                        <Statistic 
                            title="Toplam Komisyon" 
                            value={Number(stats.totalCommission || 0).toLocaleString('tr-TR')}
                            suffix="TL"
                            valueStyle={{ color: '#ff4d4f' }}
                        />
                    </Card>
                </Col>
            </Row>

            <Card style={{ marginBottom: 16 }}>
                <Tabs 
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    items={[
                        { key: 'all', label: 'Tümü' },
                        { key: 'golden', label: 'Golden Marketplace' },
                        { key: 'external', label: 'Dış Pazaryerleri' }
                    ]}
                />
                <Space wrap>
                    <Select
                        placeholder="Durum"
                        allowClear
                        style={{ width: 150 }}
                        value={statusFilter}
                        onChange={setStatusFilter}
                    >
                        {Object.entries(statusLabels).map(([key, label]) => (
                            <Option key={key} value={key}>{label}</Option>
                        ))}
                    </Select>
                    <Select
                        placeholder="Kaynak"
                        allowClear
                        style={{ width: 150 }}
                        value={sourceFilter}
                        onChange={setSourceFilter}
                    >
                        {Object.entries(sourceLabels).map(([key, label]) => (
                            <Option key={key} value={key}>{label}</Option>
                        ))}
                    </Select>
                </Space>
            </Card>

            <Card>
                <Table
                    columns={columns}
                    dataSource={orders}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                        current: page,
                        pageSize,
                        total,
                        onChange: (p, ps) => {
                            setPage(p);
                            setPageSize(ps);
                        },
                        showSizeChanger: true,
                        showTotal: (t) => `Toplam ${t} sipariş`
                    }}
                />
            </Card>

            <Modal
                title={`Sipariş: ${selectedOrder?.orderNumber}`}
                open={detailModalOpen}
                onCancel={() => setDetailModalOpen(false)}
                footer={<Button onClick={() => setDetailModalOpen(false)}>Kapat</Button>}
                width={700}
            >
                {selectedOrder && (
                    <div>
                        <Row gutter={16}>
                            <Col span={12}>
                                <Text type="secondary">Mağaza:</Text>
                                <br />
                                <Text strong>{selectedOrder.store?.storeName}</Text>
                            </Col>
                            <Col span={12}>
                                <Text type="secondary">Satıcı:</Text>
                                <br />
                                <Text>
                                    {selectedOrder.seller?.firstName} {selectedOrder.seller?.lastName}
                                    <br />
                                    <Text type="secondary">{selectedOrder.seller?.email}</Text>
                                </Text>
                            </Col>
                        </Row>
                        <Row gutter={16} style={{ marginTop: 16 }}>
                            <Col span={12}>
                                <Text type="secondary">Müşteri:</Text>
                                <br />
                                <Text>
                                    {selectedOrder.customer?.firstName} {selectedOrder.customer?.lastName}
                                    <br />
                                    <Text type="secondary">{selectedOrder.customer?.email}</Text>
                                </Text>
                            </Col>
                            <Col span={12}>
                                <Text type="secondary">Durum:</Text>
                                <br />
                                <Tag color={statusColors[selectedOrder.status]}>
                                    {statusLabels[selectedOrder.status]}
                                </Tag>
                                <br /><br />
                                <Text type="secondary">Kaynak:</Text>
                                <br />
                                <Tag>{sourceLabels[selectedOrder.source]}</Tag>
                            </Col>
                        </Row>

                        <Card size="small" style={{ marginTop: 16 }} title="Ürünler">
                            {selectedOrder.items.map((item, idx) => (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <div>
                                        <Text>{item.title}</Text>
                                        <br />
                                        <Text type="secondary">SKU: {item.sku}</Text>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <Text>{item.quantity} x {Number(item.unitPrice).toLocaleString('tr-TR')} TL</Text>
                                        <br />
                                        <Text strong>{Number(item.totalPrice).toLocaleString('tr-TR')} TL</Text>
                                    </div>
                                </div>
                            ))}
                        </Card>

                        <Card size="small" style={{ marginTop: 16 }} title="Fiyat">
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Text>Ara Toplam:</Text>
                                <Text>{Number(selectedOrder.subtotal).toLocaleString('tr-TR')} TL</Text>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Text>Kargo:</Text>
                                <Text>{Number(selectedOrder.shippingCost).toLocaleString('tr-TR')} TL</Text>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, borderTop: '1px solid #f0f0f0', paddingTop: 8 }}>
                                <Text strong>Toplam:</Text>
                                <Text strong>{Number(selectedOrder.totalAmount).toLocaleString('tr-TR')} TL</Text>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                                <Text>Komisyon (%{selectedOrder.commissionRate}):</Text>
                                <Text type="danger">-{Number(selectedOrder.commissionAmount).toLocaleString('tr-TR')} TL</Text>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                                <Text strong style={{ color: '#52c41a' }}>Satıcı Kazancı:</Text>
                                <Text strong style={{ color: '#52c41a' }}>
                                    {Number(selectedOrder.sellerEarnings).toLocaleString('tr-TR')} TL
                                </Text>
                            </div>
                        </Card>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default OrdersPage;