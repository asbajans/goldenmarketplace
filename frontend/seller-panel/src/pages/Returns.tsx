import React, { useEffect, useState } from 'react';
import { Table, Card, Button, message, Tag, Space, Select, Modal, Form, Input, InputNumber } from 'antd';
import { getSellerReturns, respondReturn, inspectReturn, refundReturn, ReturnRequest } from '../api/returns';

const { TextArea } = Input;

const STATUS_TR: Record<string, { label: string; color: string }> = {
  pending: { label: 'Onay Bekliyor', color: 'orange' },
  approved: { label: 'Onaylandı', color: 'blue' },
  rejected: { label: 'Reddedildi', color: 'red' },
  shipped: { label: 'Kargoda', color: 'cyan' },
  inspected: { label: 'İncelendi', color: 'purple' },
  refunded: { label: 'İade Edildi', color: 'green' },
  cancelled: { label: 'İptal', color: 'default' }
};

const REASON_TR: Record<string, string> = {
  withdrawal: 'Cayma (14 gün)',
  defective: 'Ayıplı ürün',
  wrong: 'Yanlış ürün',
  incomplete: 'Eksik ürün',
  other: 'Diğer'
};

const Returns: React.FC = () => {
    const [returns, setReturns] = useState<ReturnRequest[]>([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState<string>('all');
    const [pagination, setPagination] = useState({ current: 1, pageSize: 50, total: 0 });
    const [modal, setModal] = useState<null | { kind: 'respond' | 'inspect' | 'refund'; record: ReturnRequest }>(null);
    const [form] = Form.useForm();
    const [acting, setActing] = useState(false);

    const fetchReturns = async (page = 1, status?: string) => {
        setLoading(true);
        try {
            const res = await getSellerReturns({ page, limit: 50, status });
            setReturns(res.data || []);
            if (res.pagination) setPagination(p => ({ ...p, current: page, total: res.pagination.total }));
        } catch {
            message.error('İadeler yüklenemedi');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReturns(1, filter === 'all' ? undefined : filter);
    }, [filter]);

    const refresh = () => fetchReturns(pagination.current, filter === 'all' ? undefined : filter);

    const openModal = (kind: 'respond' | 'inspect' | 'refund', record: ReturnRequest) => {
        form.resetFields();
        if (kind === 'refund') form.setFieldsValue({ refundAmount: Number(record.refundAmount) || 0 });
        setModal({ kind, record });
    };

    const handleOk = async (values: any) => {
        if (!modal) return;
        setActing(true);
        try {
            if (modal.kind === 'respond') {
                await respondReturn(modal.record.id, {
                    approve: values.decision === 'approve',
                    returnAddress: values.returnAddress,
                    sellerNote: values.sellerNote
                });
                message.success(values.decision === 'approve' ? 'İade onaylandı' : 'İade reddedildi');
            } else if (modal.kind === 'inspect') {
                await inspectReturn(modal.record.id, {
                    accepted: values.decision === 'accept',
                    sellerNote: values.sellerNote
                });
                message.success(values.decision === 'accept' ? 'Ürün kabul edildi' : 'Ürün reddedildi');
            } else {
                await refundReturn(modal.record.id, { refundAmount: values.refundAmount });
                message.success('Ücret iadesi işlendi');
            }
            setModal(null);
            refresh();
        } catch (err: any) {
            message.error(err?.response?.data?.error || 'İşlem başarısız');
        } finally {
            setActing(false);
        }
    };

    const columns = [
        {
            title: 'Sipariş / Ürün',
            key: 'order',
            render: (_: any, r: ReturnRequest) => (
                <Space direction="vertical" size={0}>
                    <span style={{ fontWeight: 600 }}>#{r.order?.orderNumber || r.orderId}</span>
                    <span style={{ fontSize: 12 }}>{r.product?.title}</span>
                    <span style={{ fontSize: 11, color: '#888' }}>{r.product?.sku} • {new Date(r.createdAt).toLocaleDateString('tr-TR')}</span>
                </Space>
            )
        },
        {
            title: 'Neden',
            dataIndex: 'reason',
            key: 'reason',
            width: 140,
            render: (v: string, r: ReturnRequest) => (
                <Space direction="vertical" size={0}>
                    <span>{REASON_TR[v] || v}</span>
                    {r.customerNote && <span style={{ fontSize: 11, color: '#888' }}>{r.customerNote}</span>}
                </Space>
            )
        },
        {
            title: 'Durum',
            dataIndex: 'status',
            key: 'status',
            width: 130,
            render: (v: string) => <Tag color={STATUS_TR[v]?.color || 'default'}>{STATUS_TR[v]?.label || v}</Tag>
        },
        {
            title: 'Takip',
            key: 'tracking',
            width: 160,
            render: (_: any, r: ReturnRequest) => (
                <Space direction="vertical" size={0}>
                    {r.trackingNumber && <span style={{ fontSize: 12 }}>Kargo: {r.trackingNumber}</span>}
                    {r.returnAddress && <span style={{ fontSize: 11, color: '#888' }}>Adres verildi</span>}
                    {r.refundAmount != null && <span style={{ fontSize: 12, fontWeight: 600 }}>{Number(r.refundAmount).toLocaleString('tr-TR')} ₺</span>}
                </Space>
            )
        },
        {
            title: 'İşlem',
            key: 'actions',
            width: 220,
            render: (_: any, r: ReturnRequest) => (
                <Space>
                    {r.status === 'pending' && (
                        <Button size="small" type="primary" onClick={() => openModal('respond', r)}>Yanıtla</Button>
                    )}
                    {r.status === 'approved' && (
                        <Tag>Müşteri kargosu bekleniyor</Tag>
                    )}
                    {r.status === 'shipped' && (
                        <Button size="small" type="primary" onClick={() => openModal('inspect', r)}>İncele</Button>
                    )}
                    {r.status === 'inspected' && (
                        <Button size="small" type="primary" onClick={() => openModal('refund', r)}>İadeyi İşle</Button>
                    )}
                </Space>
            )
        }
    ];

    return (
        <Card
            title="İade Talepleri"
            extra={
                <Select value={filter} onChange={setFilter} style={{ width: 220 }}>
                    <Select.Option value="all">Tümü</Select.Option>
                    <Select.Option value="pending">Onay Bekleyenler</Select.Option>
                    <Select.Option value="approved">Onaylananlar</Select.Option>
                    <Select.Option value="shipped">Kargodakiler</Select.Option>
                    <Select.Option value="inspected">İncelenenler</Select.Option>
                    <Select.Option value="refunded">İade Edilenler</Select.Option>
                </Select>
            }
        >
            <Table
                dataSource={returns}
                columns={columns}
                rowKey="id"
                loading={loading}
                pagination={{
                    current: pagination.current,
                    pageSize: pagination.pageSize,
                    total: pagination.total,
                    showTotal: (total: number) => `Toplam ${total} iade`,
                    onChange: (page: number) => fetchReturns(page, filter === 'all' ? undefined : filter),
                    showSizeChanger: false
                }}
                size="small"
            />

            <Modal
                title={
                    modal?.kind === 'respond' ? 'İade Talebini Yanıtla'
                    : modal?.kind === 'inspect' ? 'Ürünü İncele'
                    : 'Ücret İadesini İşle'
                }
                open={!!modal}
                onCancel={() => setModal(null)}
                onOk={() => form.submit()}
                confirmLoading={acting}
                okText="Kaydet"
                cancelText="Vazgeç"
            >
                <Form form={form} layout="vertical" onFinish={handleOk}>
                    {modal?.kind === 'respond' && (
                        <>
                            <Form.Item name="decision" label="Karar" rules={[{ required: true }]} initialValue="approve">
                                <Select>
                                    <Select.Option value="approve">Onayla (iade adresi zorunlu)</Select.Option>
                                    <Select.Option value="reject">Reddet</Select.Option>
                                </Select>
                            </Form.Item>
                            <Form.Item name="returnAddress" label="İade Adresi">
                                <TextArea rows={3} placeholder="Müşterinin ürünü göndereceği adres" />
                            </Form.Item>
                            <Form.Item name="sellerNote" label="Not (opsiyonel)">
                                <TextArea rows={2} />
                            </Form.Item>
                        </>
                    )}
                    {modal?.kind === 'inspect' && (
                        <>
                            <Form.Item name="decision" label="İnceleme Sonucu" rules={[{ required: true }]} initialValue="accept">
                                <Select>
                                    <Select.Option value="accept">Kabul et (iadeye ilerle)</Select.Option>
                                    <Select.Option value="reject">Reddet (koşullara uymuyor)</Select.Option>
                                </Select>
                            </Form.Item>
                            <Form.Item name="sellerNote" label="Not (opsiyonel)">
                                <TextArea rows={2} />
                            </Form.Item>
                        </>
                    )}
                    {modal?.kind === 'refund' && (
                        <Form.Item name="refundAmount" label="İade Tutarı (₺)" rules={[{ required: true }]}>
                            <InputNumber min={0} style={{ width: '100%' }} />
                        </Form.Item>
                    )}
                </Form>
            </Modal>
        </Card>
    );
};

export default Returns;
