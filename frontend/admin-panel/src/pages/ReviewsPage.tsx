import React, { useEffect, useState } from 'react';
import { Table, Card, Button, message, Tag, Space, Select, Rate, Popconfirm, Switch, Alert, Modal, Form, InputNumber } from 'antd';
import { DeleteOutlined, CheckOutlined, RobotOutlined } from '@ant-design/icons';
import { AdminAPI } from '../services/api';

const REVIEW_LANGS = [
    { value: 'tr', label: 'Türkçe' },
    { value: 'en', label: 'English' },
    { value: 'it', label: 'Italiano' },
    { value: 'es', label: 'Español' },
    { value: 'ar', label: 'العربية' },
];

export const ReviewsPage: React.FC = () => {
    const [reviews, setReviews] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState<string>('pending');
    const [pagination, setPagination] = useState({ current: 1, pageSize: 50, total: 0 });
    const [aiVisible, setAiVisible] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiForm] = Form.useForm();
    const [productOptions, setProductOptions] = useState<any[]>([]);
    const [productSearch, setProductSearch] = useState('');

    const searchProducts = async (q: string) => {
        setProductSearch(q);
        if (!q || q.length < 2) {
            setProductOptions([]);
            return;
        }
        try {
            const res = await AdminAPI.getAllProducts({ page: 1, limit: 20, search: q });
            setProductOptions(res.data || []);
        } catch {
            setProductOptions([]);
        }
    };

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

    const handleAiGenerate = async (values: any) => {
        setAiLoading(true);
        try {
            const res = await AdminAPI.aiGenerateReviews({
                productId: values.productId,
                count: values.count || 5,
                languages: values.languages && values.languages.length > 0 ? values.languages : undefined
            });
            message.success(res.message || 'Yorumlar üretildi');
            setAiVisible(false);
            aiForm.resetFields();
            setFilter('pending');
            fetchReviews(1, false);
        } catch (err: any) {
            message.error(err?.response?.data?.error || 'Üretim başarısız');
        } finally {
            setAiLoading(false);
        }
    };

    const handleApproveAll = async (productId: string) => {
        try {
            const res = await AdminAPI.approveAllReviews(productId);
            message.success(`${res.approved} yorum onaylandı`);
            fetchReviews(pagination.current, filter === 'all' ? undefined : filter === 'approved');
        } catch {
            message.error('Toplu onay başarısız');
        }
    };

    const columns = [
        {
            title: 'Ürün',
            key: 'product',
            render: (_: any, r: any) => (
                <Space direction="vertical" size={0}>
                    {r.product?.slug ? (
                        <a
                            href={`https://www.goldencrafters.com/en/p/${encodeURIComponent(r.product.slug)}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ fontWeight: 600 }}
                        >
                            {r.product?.title || r.productId}
                        </a>
                    ) : (
                        <span style={{ fontWeight: 600 }}>{r.product?.title || r.productId}</span>
                    )}
                    <span style={{ fontSize: 11, color: '#888' }}>{r.product?.sku}</span>
                    {!r.isApproved && (
                        <Button type="link" size="small" onClick={() => handleApproveAll(r.productId)}>
                            Tümü (bu ürün)
                        </Button>
                    )}
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
                        {r.reviewerName} • {r.language ? r.language.toUpperCase() : 'TR'} • {r.createdAt ? new Date(r.createdAt).toLocaleDateString('tr-TR') : ''}
                        {r.source === 'ai'
                            ? <Tag color="purple" style={{ marginLeft: 6 }}>AI</Tag>
                            : <Tag color="blue" style={{ marginLeft: 6 }}>Müşteri</Tag>}
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
                <Space>
                    <Button icon={<RobotOutlined />} onClick={() => setAiVisible(true)}>
                        AI ile Yorum Üret
                    </Button>
                    <Select value={filter} onChange={setFilter} style={{ width: 200 }}>
                        <Select.Option value="pending">Onay Bekleyenler</Select.Option>
                        <Select.Option value="approved">Yayındakiler</Select.Option>
                        <Select.Option value="all">Tümü</Select.Option>
                    </Select>
                </Space>
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

            <Modal
                title="AI ile Yorum Üret"
                open={aiVisible}
                onCancel={() => setAiVisible(false)}
                onOk={() => aiForm.submit()}
                confirmLoading={aiLoading}
                okText="Üret"
                cancelText="İptal"
                width={560}
            >
                <Alert
                    type="warning"
                    showIcon
                    style={{ marginBottom: 16 }}
                    message="Üretilen yorumlar ONAYSIZ kaydedilir; yayınlanmadan önce tek tek inceleyin. Puan dağılımı gerçekçi karışıktır (çoğunluk 5/4, ara sıra 3)."
                />
                <Form form={aiForm} layout="vertical" onFinish={handleAiGenerate} initialValues={{ count: 5 }}>
                    <Form.Item
                        name="productId"
                        label="Ürün (ad veya SKU ile arayın)"
                        rules={[{ required: true, message: 'Ürün seçin' }]}
                    >
                        <Select
                            showSearch
                            filterOption={false}
                            placeholder="En az 2 harf yazın"
                            onSearch={searchProducts}
                            notFoundContent={productSearch.length < 2 ? 'Aramak için yazın' : 'Bulunamadı'}
                        >
                            {productOptions.map((p: any) => (
                                <Select.Option key={p.id} value={p.id}>
                                    {p.title} ({p.sku})
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item name="count" label="Adet (1-10)" rules={[{ required: true }]}>
                        <InputNumber min={1} max={10} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="languages" label="Diller (boş = 5 dil karışık)">
                        <Select mode="multiple" placeholder="Seçilmezse en/tr/it/es/ar karışık üretilir">
                            {REVIEW_LANGS.map(l => (
                                <Select.Option key={l.value} value={l.value}>{l.label}</Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>
        </Card>
    );
};

export default ReviewsPage;
