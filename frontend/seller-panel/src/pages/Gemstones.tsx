import React, { useEffect, useState } from 'react';
import { Table, Card, Button, message, Tag, Space, Modal, Form, Input, InputNumber, Switch, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { getGemstones, createGemstone, updateGemstone, deleteGemstone, gemstoneHelpers, Gemstone } from '../api/gemstones';

const { TextArea } = Input;

const Gemstones: React.FC = () => {
    const [stones, setStones] = useState<Gemstone[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editing, setEditing] = useState<Gemstone | null>(null);
    const [form] = Form.useForm();

    const fetchStones = async () => {
        setLoading(true);
        try {
            setStones(await getGemstones());
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

    const handleEdit = (record: Gemstone) => {
        setEditing(record);
        form.setFieldsValue({
            ...record,
            cutLines: gemstoneHelpers.objToLines(record.cutMultipliers),
            qualityLines: gemstoneHelpers.objToLines(record.qualityMultipliers)
        });
        setModalVisible(true);
    };

    const handleSave = async (values: any) => {
        try {
            if (editing) {
                await updateGemstone(editing.id, values);
                message.success('Taş güncellendi');
            } else {
                await createGemstone(values);
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
            render: (_: any, r: Gemstone) => r.storeId
                ? <Tag color="blue">Mağazam</Tag>
                : <Tag color="gold">Global (admin)</Tag>
        },
        {
            title: 'Karat Fiyatı (USD)',
            dataIndex: 'pricePerCaratUSD',
            key: 'pricePerCaratUSD',
            render: (v: number) => Number(v) > 0 ? `$${Number(v).toLocaleString('en-US')}` : <Tag>Teşhir</Tag>
        },
        { title: 'Durum', dataIndex: 'isActive', key: 'isActive', render: (v: boolean) => <Tag color={v ? 'success' : 'default'}>{v ? 'Aktif' : 'Pasif'}</Tag> },
        {
            title: 'İşlemler',
            key: 'actions',
            render: (_: any, record: Gemstone) => (
                !record.storeId ? (
                    <span style={{ color: '#bbb', fontSize: 12 }}>Admin yönetir</span>
                ) : (
                    <Space>
                        <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} />
                        <Popconfirm title="Taş silinsin mi? (ürün seçenekleri de kalkar)" onConfirm={async () => { await deleteGemstone(record.id); fetchStones(); }}>
                            <Button icon={<DeleteOutlined />} danger />
                        </Popconfirm>
                    </Space>
                )
            )
        }
    ];

    return (
        <Card
            title="Taş Kataloğu"
            extra={<Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>Yeni Taş</Button>}
        >
            <p style={{ color: '#888', marginBottom: 16 }}>
                Baz karat fiyatları admin tarafından USD girilir (altın fiyatı gibi); TRY karşılığı güncel kurla hesaplanır.
                Karat fiyatı 0 ise taş teşhir amaçlıdır (fiyata eklenmez, sitede adı+karatı görünür).
                Çarpanlar satır başına <code>kesim=çarpan</code> formatında yazılır.
            </p>
            <Table dataSource={stones} columns={columns} rowKey="id" loading={loading} pagination={false} />

            <Modal
                title={editing ? 'Taş Düzenle' : 'Yeni Taş'}
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
                    <Form.Item name="pricePerCaratUSD" label="Karat Fiyatı (USD)" tooltip="TRY karşılığı güncel kurla hesaplanır. 0 = teşhir">
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

export default Gemstones;
