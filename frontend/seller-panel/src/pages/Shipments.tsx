import React, { useState, useEffect } from 'react';
import { 
    Table, Tag, Button, Card, Space, Input, Typography, message, Modal, Form, Tooltip, Badge
} from 'antd';
import { 
    SendOutlined
} from '@ant-design/icons';
import client from '../api/client';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Text } = Typography;

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
    shippingDeadline: string;
    trackingNumber?: string;
    shippingCompany?: string;
    source: string;
    customerNote?: string;
    createdAt: string;
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
    returned: 'volcano'
};

const statusLabels: Record<string, string> = {
    pending: 'Bekliyor',
    confirmed: 'Onaylandı',
    processing: 'Hazırlanıyor',
    shipped: 'Kargolandı',
    delivered: 'Teslim Edildi',
    cancelled: 'İptal',
    returned: 'İade'
};

const sourceLabels: Record<string, string> = {
    golden: 'Golden',
    trendyol: 'Trendyol',
    hepsiburada: 'Hepsiburada',
    etsy: 'Etsy',
    amazon: 'Amazon',
    other: 'Diğer'
};

const Shipments: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(false);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    
    // Modals
    const [shippingModalOpen, setShippingModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [shippingForm] = Form.useForm();

    useEffect(() => {
        fetchOrders();
    }, [page, pageSize]);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            // Let's filter locally if backend doesn't support comma-separated status
            // Actually standard findAndCountAll might not support it out of the box unless handled.
            // We'll just fetch all and filter locally for simplicity, or we hope the backend returns them all.
            // Better to just fetch all active ones. Since we might need pagination, let's fetch without status filter 
            // and maybe filter if needed, or assume we fetch recent. 
            // Wait, we can fetch all and filter locally if we want a clean view, but pagination will be weird.
            // For now, we'll fetch everything and filter, or just let them see all.
            // Let's just fetch all and filter in frontend.
            const allRes = await client.get('/orders', { params: { page: 1, limit: 100 } });
            const filteredOrders = allRes.data.orders.filter((o: Order) => 
                ['confirmed', 'processing', 'shipped'].includes(o.status)
            );
            setOrders(filteredOrders);
            setTotal(filteredOrders.length);
        } catch (error: any) {
            message.error('Kargolar yüklenirken hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    const getCountdown = (deadline: string) => {
        const now = dayjs();
        const end = dayjs(deadline);
        const diffDays = end.diff(now, 'day');
        const diffHours = end.diff(now, 'hour');

        if (diffHours < 0) return { text: 'Gecikti', color: 'error' };
        if (diffHours < 24) return { text: `${diffHours} Saat Kaldı`, color: 'warning' };
        return { text: `${diffDays} Gün Kaldı`, color: 'success' };
    };

    const handleShippingSubmit = async () => {
        if (!selectedOrder) return;
        try {
            const values = await shippingForm.validateFields();
            await client.patch(`/orders/${selectedOrder.id}/shipping`, values);
            message.success('Kargo bilgileri güncellendi');
            setShippingModalOpen(false);
            fetchOrders();
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
            title: 'Durum',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => (
                <Tag color={statusColors[status]}>{statusLabels[status]}</Tag>
            )
        },
        {
            title: 'Kargo Şirketi',
            dataIndex: 'shippingCompany',
            key: 'shippingCompany',
            render: (text: string) => text || '-'
        },
        {
            title: 'Takip No',
            dataIndex: 'trackingNumber',
            key: 'trackingNumber',
            render: (text: string) => text ? <Text copyable>{text}</Text> : '-'
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
            title: 'İşlem',
            key: 'actions',
            render: (_: any, record: Order) => (
                <Space>
                    <Tooltip title="Kargo Bilgisi Gir/Güncelle">
                        <Button 
                            type="primary" 
                            icon={<SendOutlined />} 
                            onClick={() => {
                                setSelectedOrder(record);
                                shippingForm.setFieldsValue({
                                    trackingNumber: record.trackingNumber,
                                    shippingCompany: record.shippingCompany
                                });
                                setShippingModalOpen(true);
                            }}
                        >
                            Kargo Gir
                        </Button>
                    </Tooltip>
                </Space>
            )
        }
    ];

    return (
        <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, alignItems: 'center' }}>
                <Typography.Title level={4} style={{ margin: 0 }}>Kargolar</Typography.Title>
                <Button type="primary" onClick={fetchOrders}>Yenile</Button>
            </div>

            <Card bodyStyle={{ padding: 0 }}>
                <Table 
                    columns={columns} 
                    dataSource={orders} 
                    rowKey="id"
                    loading={loading}
                    pagination={{
                        current: page,
                        pageSize: pageSize,
                        total: total,
                        onChange: (p, s) => { setPage(p); setPageSize(s); },
                        showSizeChanger: true
                    }}
                />
            </Card>

            <Modal
                title="Kargo Bilgilerini Güncelle"
                open={shippingModalOpen}
                onOk={handleShippingSubmit}
                onCancel={() => setShippingModalOpen(false)}
                okText="Kaydet ve Kargolandı İşaretle"
                cancelText="İptal"
            >
                <Form form={shippingForm} layout="vertical">
                    <Form.Item 
                        name="shippingCompany" 
                        label="Kargo Şirketi"
                        rules={[{ required: true, message: 'Kargo şirketi zorunludur' }]}
                    >
                        <Input placeholder="Örn: Yurtiçi Kargo, PTT, UPS" />
                    </Form.Item>
                    <Form.Item 
                        name="trackingNumber" 
                        label="Takip Numarası"
                        rules={[{ required: true, message: 'Takip numarası zorunludur' }]}
                    >
                        <Input placeholder="Takip Numarası" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default Shipments;
