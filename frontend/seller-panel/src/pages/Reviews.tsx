import React, { useEffect, useState } from 'react';
import { Table, Card, Tag, Space, Select, Rate, message } from 'antd';
import { getSellerReviews } from '../api/reviews';

const Reviews: React.FC = () => {
    const [reviews, setReviews] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState<string>('all');
    const [pagination, setPagination] = useState({ current: 1, pageSize: 50, total: 0 });

    const fetchReviews = async (page = 1, approved?: boolean) => {
        setLoading(true);
        try {
            const res = await getSellerReviews({ page, limit: 50, approved });
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
            width: 150,
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
                        {r.reviewerName} • {r.language ? String(r.language).toUpperCase() : 'TR'} • {r.createdAt ? new Date(r.createdAt).toLocaleDateString('tr-TR') : ''}
                        {r.isVerifiedPurchase && <Tag color="green" style={{ marginLeft: 6 }}>Doğrulanmış</Tag>}
                    </span>
                </Space>
            )
        },
        {
            title: 'Durum',
            dataIndex: 'isApproved',
            key: 'isApproved',
            width: 110,
            render: (v: boolean) => <Tag color={v ? 'success' : 'warning'}>{v ? 'Yayında' : 'Bekliyor'}</Tag>
        }
    ];

    return (
        <Card
            title="Ürün Yorumları"
            extra={
                <Select value={filter} onChange={setFilter} style={{ width: 200 }}>
                    <Select.Option value="all">Tümü</Select.Option>
                    <Select.Option value="approved">Yayındakiler</Select.Option>
                    <Select.Option value="pending">Onay Bekleyenler</Select.Option>
                </Select>
            }
        >
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

export default Reviews;
