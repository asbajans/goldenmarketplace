import React, { useEffect, useState } from 'react';
import { Table, Card, Button, message, Tag, Space, Modal, Form, Input, InputNumber, Switch, Popconfirm, Alert } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { AdminAPI } from '../services/api';

const { TextArea } = Input;

const linesToObj = (text?: string): Record<string, number> => {
    const out: Record<string, number> = {};
    for (const line of String(text || '').split('\n')) {
        const [k, v] = line.split('=').map(s => (s || '').trim());
        const n = Number((v || '').replace(',', '.'));
        if (k && Number.isFinite(n) && n > 0) out[k.toLowerCase()] = n;
    }
    return out;
};

const objToLines = (obj?: Record<string, number>): string =>
    Object.entries(obj || {}).map(([k, v]) => `${k}=${v}`).join('\n');

export const GemstonesPage: React.FC = () => {
    const [stones, setStones] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [form] = Form.useForm();

    const fetchStones = async () => {
        setLoading(true);
        try {
            const data = await AdminAPI.getGemstones();
            setStones(Array.isArray(data) ? data : []);
        } catch {
            message.error('Taş listesi alınamadı');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchStones(); }, []);

    const handleAdd = () => {
        setEditing(null);
        form.resetFields();
        form.setFieldsValue({ pricePerCaratUSD: 0, isActive: true, cutLines: 'baget=1.2\nmarkiz=1.15\noval=1.1\nprenses=1.1', qualityLines: '' });
        setModalVisible(true);
    };

    const handleEdit = (record: any) => {
        setEditing(record);
        form.setFieldsValue({
            ...record,
            cutLines: objToLines(record.cutMultipliers),
            qualityLines: objToLines(record.qualityMultipliers)
        });
        setModalVisible(true);
    };

    const handleSave = async (values: any) => {
        try {
            const payload = {
                ...values,
                cutMultipliers: linesToObj(values.cutLines),
                qualityMultipliers: linesToObj(values.qualityLines)
            };
            delete payload.cutLines;
            delete payload.qualityLines;
            if (editing) {
                await AdminAPI.updateGemstone(editing.id, payload);
                message.success('Taş güncellendi');
            } else {
                await AdminAPI.createGemstone(payload);
                message.success('Taş eklendi');
            }
            setModalVisible(false);
            fetchStones();
        } catch (err: any) {
            message.error(err?.response?.data?.error || 'İşlem başarısız');
        }
    };

    const columns = [
        { title: 'Taş Adı', dataIndex: 'name', key: 'name' },
        {
            title: 'Kapsam',
            key: 'scope',
            render: (_: any, r: any) => r.storeId
                ? <Tag color="blue">Satıcı</Tag>
                : <Tag color="gold">Global</Tag>
        },
        {
            title: 'Karat Fiyatı (USD)',
            dataIndex: 'pricePerCaratUSD',
            key: 'pricePerCaratUSD',
            render: (v: number) => Number(v) > 0 ? `$${Number(v).toLocaleString('en-US')}` : <Tag>Fiyat girilmedi</Tag>
        },
        { title: 'Durum', dataIndex: 'isActive', key: 'isActive', render: (v: boolean) => <Tag color={v ? 'success' : 'default'}>{v ? 'Aktif' : 'Pasif'}</Tag> },
        {
            title: 'İşlemler',
            key: 'actions',
            render: (_: any, record: any) => (
                <Space>
                    <Button icon={<EditOutlined />} type="link" onClick={() => handleEdit(record)} />
                    <Popconfirm title="Taş silinsin mi? (ürün seçenekleri de kalkar)" onConfirm={async () => { await AdminAPI.deleteGemstone(record.id); fetchStones(); }}>
                        <Button icon={<DeleteOutlined />} type="link" danger />
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <Card title="Taş Kataloğu (Global + Satıcı)" extra={<Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>Yeni Taş</Button>}>
            <Alert
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
                message="Baz karat fiyatları USD girilir (altın fiyatı gibi); TRY karşılığı güncel kurla hesaplanır. 0 = teşhir (fiyata eklenmez). Satıcı taşları salt okunur listelenir."
            />
            <Table dataSource={stones} columns={columns} rowKey="id" loading={loading} pagination={false} />

            <Modal
                title={editing ? 'Taş Düzenle' : 'Yeni Taş (Global)'}
                open={modalVisible}
                onCancel={() => setModalVisible(false)}
                onOk={() => form.submit()}
                okText="Kaydet"
                cancelText="İptal"
                width={600}
            >
                <Form form={form} layout="vertical" onFinish={handleSave}>
                    <Form.Item name="name" label="Taş Adı" rules={[{ required: true }]}>
                        <Input placeholder="Pırlanta, Yakut, Zümrüt..." />
                    </Form.Item>
                    <Form.Item name="pricePerCaratUSD" label="Baz Karat Fiyatı (USD)" tooltip="TRY karşılığı güncel USD kuruyla hesaplanır">
                        <InputNumber min={0} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="cutLines" label="Kesim Çarpanları (satır başına kesim=çarpan)">
                        <TextArea rows={4} placeholder={'baget=1.2\nmarkiz=1.15'} />
                    </Form.Item>
                    <Form.Item name="qualityLines" label="Özellik Çarpanları (satır başına özellik=çarpan)">
                        <TextArea rows={3} placeholder={'fg/si=1.1'} />
                    </Form.Item>
                    <Form.Item name="isActive" label="Aktif mi?" valuePropName="checked">
                        <Switch />
                    </Form.Item>
                </Form>
            </Modal>
        </Card>
    );
};

export default GemstonesPage;
