import React, { useState, useEffect } from 'react';
import { 
    Table, Tag, Button, Card, Space, Input, Select, DatePicker, 
    Typography, Row, Col, Statistic, message, Modal, Form, Tooltip, Badge
} from 'antd';
import { 
    EyeOutlined, 
    CheckCircleOutlined, CloseCircleOutlined, SendOutlined,
    CarOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

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
    shippingTime: number;
    shippingDeadline: string;
    trackingNumber?: string;
    shippingCompany?: string;
    source: string;
    currency?: string;
    customerNote?: string;
    createdAt: string;
    confirmedDate?: string;
    shippedDate?: string;
    deliveredDate?: string;
    items: OrderItem[];
    customer?: {
        firstName: string;
        lastName: string;
        email: string;
    };
    shippingAddress?: any;
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

const Orders: React.FC = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [sourceFilter, setSourceFilter] = useState<string>('');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [shippingModalOpen, setShippingModalOpen] = useState(false);
    const [shippingForm] = Form.useForm();

    useEffect(() => {
        fetchOrders();
    }, [page, pageSize, statusFilter, sourceFilter]);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const params: any = { page, limit: pageSize };
            if (statusFilter) params.status = statusFilter;
            if (sourceFilter) params.source = sourceFilter;
            
            const res = await client.get('/orders', { params });
            setOrders(res.data.orders || []);
            setTotal(res.data.total || 0);
        } catch (error: any) {
            message.error('Siparişler yüklenirken hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    const getCountdown = (deadline: string) => {
        const now = dayjs();
        const deadlineDate = dayjs(deadline);
        const diff = deadlineDate.diff(now, 'hour');
        
        if (diff < 0) {
            return { text: 'Süre doldu', color: 'red' };
        }
        if (diff < 24) {
            return { text: `${diff} saat`, color: 'red' };
        }
        const days = Math.floor(diff / 24);
        return { text: `${days} gün`, color: days <= 1 ? 'red' : 'orange' };
    };

    const handleStatusChange = async (orderId: string, newStatus: string) => {
        try {
            await client.patch(`/orders/${orderId}/status`, { status: newStatus });
            message.success('Sipariş durumu güncellendi');
            fetchOrders();
            setDetailModalOpen(false);
        } catch (error: any) {
            message.error('Durum güncellenirken hata oluştu');
        }
    };

    const handleShippingSubmit = async () => {
        if (!selectedOrder) return;
        try {
            const values = await shippingForm.validateFields();
            await client.patch(`/orders/${selectedOrder.id}/shipping`, values);
            message.success('Kargo bilgileri güncellendi');
            setShippingModalOpen(false);
            fetchOrders();
            setDetailModalOpen(false);
        } catch (error: any) {
            message.error('Kargo bilgileri güncellenirken hata oluştu');
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
            render: (amount: number, record: Order) => {
                const formatter = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: record.currency || 'TRY' });
                return <Text strong>{formatter.format(amount)}</Text>;
            }
        },
        {
            title: 'Komisyon',
            dataIndex: 'commissionAmount',
            key: 'commissionAmount',
            render: (amount: number, record: Order) => {
                const formatter = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: record.currency || 'TRY' });
                return <Text type="danger">{formatter.format(amount)}</Text>;
            }
        },
        {
            title: 'Kazanç',
            dataIndex: 'sellerEarnings',
            key: 'sellerEarnings',
            render: (amount: number, record: Order) => {
                const formatter = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: record.currency || 'TRY' });
                return (
                    <Text type="success" style={{ color: '#52c41a' }}>
                        {formatter.format(amount)}
                    </Text>
                );
            }
        },
        {
            title: 'Kargo Son',
            dataIndex: 'shippingDeadline',
            key: 'shippingDeadline',
            render: (deadline: string) => {
                if (!deadline) return '-';
                const { text, color } = getCountdown(deadline);
                return (
                    <Badge status={color as any} text={text} />
                );
            }
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
                <Space>
                    <Tooltip title="İncele">
                        <Button 
                            type="text" 
                            icon={<EyeOutlined />} 
                            onClick={() => {
                                setSelectedOrder(record);
                                setDetailModalOpen(true);
                            }}
                        />
                    </Tooltip>
                    {record.status === 'confirmed' && (
                        <Tooltip title="Kargo Bilgisi">
                            <Button 
                                type="text" 
                                icon={<CarOutlined />}
                                onClick={() => {
                                    setSelectedOrder(record);
                                    shippingForm.setFieldsValue({
                                        trackingNumber: record.trackingNumber,
                                        shippingCompany: record.shippingCompany,
                                        shippingTime: record.shippingTime
                                    });
                                    setShippingModalOpen(true);
                                }}
                            />
                        </Tooltip>
                    )}
                </Space>
            )
        }
    ];

    return (
        <div>
            <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={6}>
                    <Card>
                        <Statistic 
                            title="Toplam Sipariş" 
                            value={total} 
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic 
                            title="Bekleyen" 
                            value={orders.filter(o => o.status === 'pending').length} 
                            valueStyle={{ color: '#faad14' }}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic 
                            title="Kargolanacak" 
                            value={orders.filter(o => o.status === 'confirmed' || o.status === 'processing').length}
                            valueStyle={{ color: '#1890ff' }}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic 
                            title="Teslim Edildi" 
                            value={orders.filter(o => o.status === 'delivered').length}
                            valueStyle={{ color: '#52c41a' }}
                        />
                    </Card>
                </Col>
            </Row>

            <Card style={{ marginBottom: 16 }}>
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
                footer={null}
                width={700}
            >
                {selectedOrder && (
                    <div>
                        <Row gutter={16}>
                            <Col span={12}>
                                <Text type="secondary">Durum:</Text>
                                <br />
                                <Tag color={statusColors[selectedOrder.status]}>
                                    {statusLabels[selectedOrder.status]}
                                </Tag>
                            </Col>
                            <Col span={12}>
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
                                <Text>{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: selectedOrder.currency || 'TRY' }).format(selectedOrder.subtotal)}</Text>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Text>Kargo:</Text>
                                <Text>{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: selectedOrder.currency || 'TRY' }).format(selectedOrder.shippingCost)}</Text>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, borderTop: '1px solid #f0f0f0', paddingTop: 8 }}>
                                <Text strong>Toplam:</Text>
                                <Text strong>{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: selectedOrder.currency || 'TRY' }).format(selectedOrder.totalAmount)}</Text>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                                <Text>Komisyon (%{selectedOrder.commissionRate}):</Text>
                                <Text type="danger">-{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: selectedOrder.currency || 'TRY' }).format(selectedOrder.commissionAmount)}</Text>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                                <Text strong style={{ color: '#52c41a' }}>Kazanç:</Text>
                                <Text strong style={{ color: '#52c41a' }}>
                                    {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: selectedOrder.currency || 'TRY' }).format(selectedOrder.sellerEarnings)}
                                </Text>
                            </div>
                        </Card>

                        {selectedOrder.shippingAddress && (
                            <Card size="small" style={{ marginTop: 16 }} title="Kargo Adresi">
                                <Text>
                                    {selectedOrder.shippingAddress.name}<br />
                                    {selectedOrder.shippingAddress.address}<br />
                                    {selectedOrder.shippingAddress.city} / {selectedOrder.shippingAddress.district}<br />
                                    {selectedOrder.shippingAddress.phone}
                                </Text>
                            </Card>
                        )}

                        {selectedOrder.trackingNumber && (
                            <Card size="small" style={{ marginTop: 16 }} title="Kargo Bilgisi">
                                <Text>Takip No: {selectedOrder.trackingNumber}</Text>
                                <br />
                                <Text>Firma: {selectedOrder.shippingCompany}</Text>
                            </Card>
                        )}

                        <Space style={{ marginTop: 16 }} wrap>
                            {selectedOrder.status === 'pending' && (
                                <>
                                    <Button 
                                        type="primary"
                                        icon={<CheckCircleOutlined />}
                                        onClick={() => handleStatusChange(selectedOrder.id, 'confirmed')}
                                    >
                                        Onayla
                                    </Button>
                                    <Button 
                                        danger
                                        icon={<CloseCircleOutlined />}
                                        onClick={() => handleStatusChange(selectedOrder.id, 'cancelled')}
                                    >
                                        İptal Et
                                    </Button>
                                </>
                            )}
                            {selectedOrder.status === 'confirmed' && (
                                <>
                                    <Button 
                                        type="primary"
                                        icon={<SendOutlined />}
                                        onClick={() => handleStatusChange(selectedOrder.id, 'processing')}
                                    >
                                        İşleme Al
                                    </Button>
                                </>
                            )}
                            {(selectedOrder.status === 'confirmed' || selectedOrder.status === 'processing') && (
                                <Button 
                                    type="primary"
                                    icon={<CarOutlined />}
                                    onClick={() => {
                                        shippingForm.setFieldsValue({
                                            trackingNumber: selectedOrder.trackingNumber,
                                            shippingCompany: selectedOrder.shippingCompany,
                                            shippingTime: selectedOrder.shippingTime
                                        });
                                        setShippingModalOpen(true);
                                    }}
                                >
                                    Kargo Ekle
                                </Button>
                            )}
                            {selectedOrder.status === 'processing' && (
                                <Button 
                                    type="primary"
                                    icon={<CarOutlined />}
                                    onClick={() => handleStatusChange(selectedOrder.id, 'shipped')}
                                >
                                    Kargola
                                </Button>
                            )}
                        </Space>
                    </div>
                )}
            </Modal>

            <Modal
                title="Kargo Bilgileri"
                open={shippingModalOpen}
                onCancel={() => setShippingModalOpen(false)}
                onOk={handleShippingSubmit}
            >
                <Form form={shippingForm} layout="vertical">
                    <Form.Item name="trackingNumber" label="Takip Numarası">
                        <Input placeholder="Kargo takip numarası" />
                    </Form.Item>
                    <Form.Item name="shippingCompany" label="Kargo Şirketi">
                        <Input placeholder="Kargo şirketi" />
                    </Form.Item>
                    <Form.Item name="shippingTime" label="Kargo Süresi (Gün)">
                        <Input type="number" min={1} max={30} />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default Orders;