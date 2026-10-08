import React, { useEffect, useState } from 'react';
import { Table, Card, Button, Space, message, Tag, Select, Modal, Input } from 'antd';
import { CheckOutlined, CloseOutlined, ReloadOutlined } from '@ant-design/icons';
import { AdminAPI } from '../services/api';

const STATUS_LABEL: Record<string, { color: string; text: string }> = {
    pending: { color: 'warning', text: 'Onay Bekliyor' },
    paid: { color: 'success', text: 'Ödendi' },
    rejected: { color: 'error', text: 'Reddedildi' },
    failed: { color: 'error', text: 'Başarısız' },
    cancelled: { color: 'default', text: 'İptal' }
};

export const PaymentsPage: React.FC = () => {
    const [payments, setPayments] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string>('pending');
    const [kindFilter, setKindFilter] = useState<string | undefined>(undefined);
    const [rejecting, setRejecting] = useState<any>(null);
    const [rejectReason, setRejectReason] = useState('');

    const fetchPayments = async () => {
        setLoading(true);
        try {
            const data = await AdminAPI.getPayments({
                ...(statusFilter ? { status: statusFilter } : {}),
                ...(kindFilter ? { kind: kindFilter } : {})
            });
            setPayments(Array.isArray(data) ? data : []);
        } catch {
            message.error('Ödemeler yüklenemedi');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPayments();
    }, [statusFilter, kindFilter]);

    const handleApprove = (record: any) => {
        Modal.confirm({
            title: 'Ödemeyi onayla',
            content: `${record.kind === 'subscription' ? 'Paket' : `${record.credits} kredi`} — ${record.amount} ${record.currency} (${record.provider === 'bank' ? 'Havale/EFT' : record.provider}). Onaylayınca ilgili haklar hemen aktifleşir.`,
            okText: 'Onayla',
            onOk: async () => {
                try {
                    await AdminAPI.approvePayment(record.id);
                    message.success('Ödeme onaylandı, haklar aktifleşti');
                    fetchPayments();
                } catch (error: any) {
                    message.error(error.response?.data?.error || 'Onay başarısız');
                }
            }
        });
    };

    const handleReject = async () => {
        if (!rejecting) return;
        try {
            await AdminAPI.rejectPayment(rejecting.id, rejectReason);
            message.success('Ödeme reddedildi');
            setRejecting(null);
            setRejectReason('');
            fetchPayments();
        } catch (error: any) {
            message.error(error.response?.data?.error || 'Red başarısız');
        }
    };

    const columns = [
        {
            title: 'Tarih', dataIndex: 'createdAt', key: 'createdAt',
            render: (d: string) => new Date(d).toLocaleString('tr-TR')
        },
        {
            title: 'Tür', dataIndex: 'kind', key: 'kind',
            render: (k: string, r: any) => k === 'subscription'
                ? `Paket (${r.billingPeriod === 'yearly' ? 'Yıllık' : 'Aylık'})`
                : `Kredi (${r.credits})`
        },
        {
            title: 'Tutar', dataIndex: 'amount', key: 'amount',
            render: (a: number, r: any) => `$${a} ${r.currency || 'USD'}`
        },
        {
            title: 'Yöntem', dataIndex: 'provider', key: 'provider',
            render: (p: string) => p === 'stripe' ? 'Kart (Stripe)' : p === 'bank' ? 'Havale/EFT' : 'Manuel'
        },
        {
            title: 'Durum', dataIndex: 'status', key: 'status',
            render: (s: string) => <Tag color={STATUS_LABEL[s]?.color || 'default'}>{STATUS_LABEL[s]?.text || s}</Tag>
        },
        {
            title: 'İşlemler',
            key: 'actions',
            render: (_: any, record: any) => record.status === 'pending' ? (
                <Space>
                    <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => handleApprove(record)}>
                        Onayla
                    </Button>
                    <Button size="small" danger icon={<CloseOutlined />} onClick={() => setRejecting(record)}>
                        Reddet
                    </Button>
                </Space>
            ) : null
        }
    ];

    return (
        <Card
            title="Ödeme Onayları"
            extra={
                <Space>
                    <Select
                        value={kindFilter}
                        onChange={setKindFilter}
                        allowClear
                        placeholder="Tür"
                        style={{ width: 140 }}
                        options={[
                            { value: 'subscription', label: 'Paket' },
                            { value: 'credit', label: 'Kredi' }
                        ]}
                    />
                    <Select
                        value={statusFilter}
                        onChange={setStatusFilter}
                        allowClear
                        placeholder="Durum"
                        style={{ width: 160 }}
                        options={[
                            { value: 'pending', label: 'Onay Bekleyen' },
                            { value: 'paid', label: 'Ödenen' },
                            { value: 'rejected', label: 'Reddedilen' },
                            { value: 'cancelled', label: 'İptal' }
                        ]}
                    />
                    <Button icon={<ReloadOutlined />} onClick={fetchPayments}>Yenile</Button>
                </Space>
            }
        >
            <Table
                dataSource={payments}
                columns={columns}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 15 }}
                scroll={{ x: 'max-content' }}
            />

            <Modal
                title="Ödemeyi Reddet"
                open={!!rejecting}
                onCancel={() => { setRejecting(null); setRejectReason(''); }}
                onOk={handleReject}
                okText="Reddet"
                okButtonProps={{ danger: true }}
            >
                <p>Reddetme nedenini yazın (satıcıya gösterilmez, kayda geçer):</p>
                <Input.TextArea
                    rows={3}
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    placeholder="örn: Dekont bulunamadı"
                />
            </Modal>
        </Card>
    );
};

export default PaymentsPage;
