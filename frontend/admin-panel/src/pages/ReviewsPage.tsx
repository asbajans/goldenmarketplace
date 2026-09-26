import React, { useEffect, useState } from 'react';
import { Table, Card, Button, message, Tag, Space, Select, Rate, Popconfirm, Switch, Alert } from 'antd';
import { DeleteOutlined, CheckOutlined } from '@ant-design/icons';
import { AdminAPI } from '../services/api';

export const ReviewsPage: React.FC = () => {
    const [reviews, setReviews] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState<string>('pending');
    const [pagination, setPagination] = useState({ current: 1, pageSize: 50, total: 0 });

    const fetchReviews = async (page = 1, approved?: boolean) => {
        setLoading(true);
        try {
            const res = await AdminAPI.getReviews({ page, limit: 50, approved });
            setReviews(res.data || []);
            if (res.pagination) {
                setPagination(p => ({ ...p, current: page, total: res.pagination.total }));
            }
        } catch {
            message.error('Yorumlar yüklenemedi');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReviews(1, filter === 'all' ? undefined : filter === 'approved');
    }, [filter]);

    const handleApprove = async (record: any, approved: boolean) => {
        try {
            await AdminAPI.updateReview(record.id, { isApproved: approved });
            message.success(approved ? 'Yorum onaylandı, ürün puanı güncellendi' : 'Yorum yayından kaldırıldı');
            fetchReviews(pagination.current, filter === 'all' ? undefined : filter === 'approved');
        } catch {
            message.error('İşlem başarısız');
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await AdminAPI.deleteReview(id);
            message.success('Yorum silindi');
            fetchReviews(pagination.current, filter === 'all' ? undefined : filter === 'approved');
        } catch {
            message.error('Silme başarısız');
        }
    };

    const columns = [
        {
            title: 'Ürün',
            key: 'product',
            render: (_: any, r: any) => (
                <Space direction="vertical" size={0}>
                    <span style={{ fontWeight: 600 }}>{r.product?.title || r.productId}</span>
                    <span style={{ fontSize: 11, color: '#888' }}>{r.product?.sku}</span>
                </Space>
            )
        },
        {
            title: 'Puan',
            dataIndex: 'rating',
            key: 'rating',
            width: 160,
            render: (v: number) => <Rate disabled defaultValue={v} style={{ fontSize: 14 }} />
        },
        {
            title: 'Yorum',
            key: 'comment',
            render: (_: any, r: any) => (
                <Space direction="vertical" size={0}>
                    <span style={{ fontWeight: 600 }}>{r.title}</span>
                    <span>{r.comment}</span>
                    <span style={{ fontSize: 11, color: '#888' }}>
                        {r.reviewerName} • {new Date(r.createdAt).toLocaleDateString('tr-TR')}
                        {r.isVerifiedPurchase && <Tag color="green" style={{ marginLeft: 6 }}>Doğrulanmış Alışveriş</Tag>}
                    </span>
                </Space>
            )
        },
        {
            title: 'Durum',
            dataIndex: 'isApproved',
            key: 'isApproved',
            width: 120,
            render: (v: boolean, r: any) => (
                <Switch
                    checked={v}
                    checkedChildren="Yayında"
                    unCheckedChildren="Bekliyor"
                    onChange={(checked) => handleApprove(r, checked)}
                />
            )
        },
        {
            title: 'İşlem',
            key: 'actions',
            width: 120,
            render: (_: any, r: any) => (
                <Space>
                    {!r.isApproved && (
                        <Button type="link" icon={<CheckOutlined />} onClick={() => handleApprove(r, true)}>
                            Onayla
                        </Button>
                    )}
                    <Popconfirm title="Yorum silinsin mi?" onConfirm={() => handleDelete(r.id)} okText="Evet" cancelText="Hayır">
                        <Button type="link" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <Card
            title="Ürün Yorumları (Moderasyon)"
            extra={
                <Select value={filter} onChange={setFilter} style={{ width: 200 }}>
                    <Select.Option value="pending">Onay Bekleyenler</Select.Option>
                    <Select.Option value="approved">Yayındakiler</Select.Option>
                    <Select.Option value="all">Tümü</Select.Option>
                </Select>
            }
        >
            <Alert
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
                message="Onaylanan yorumlar ürün sayfasında, JSON-LD snippet'inde (aggregateRating/review) ve Google Product Ratings feed'inde yayınlanır. Sahte yorum girmeyin — Google politikalarına aykırıdır ve Merchant Center hesabının askıya alınmasına yol açabilir."
            />
            <Table
                dataSource={reviews}
                columns={columns}
                rowKey="id"
                loading={loading}
                pagination={{
                    current: pagination.current,
                    pageSize: pagination.pageSize,
                    total: pagination.total,
                    showTotal: (total: number) => `Toplam ${total} yorum`,
                    onChange: (page: number) =>
                        fetchReviews(page, filter === 'all' ? undefined : filter === 'approved'),
                    showSizeChanger: false
                }}
                size="small"
            />
        </Card>
    );
};

export default ReviewsPage;
