import React, { useEffect, useState } from 'react';
import { Table, Card, Button, Space, Modal, Form, Input, InputNumber, Switch, message, Tag, Select } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { AdminAPI } from '../services/api';

export const SubscriptionsPage: React.FC = () => {
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingPlan, setEditingPlan] = useState<any>(null);
    const [form] = Form.useForm();

    const fetchPlans = async () => {
        setLoading(true);
        try {
            const data = await AdminAPI.getSubscriptionPlans();
            setPlans(data);
        } catch (error) {
            message.error('Failed to load subscription plans');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlans();
    }, []);

    const handleAdd = () => {
        setEditingPlan(null);
        form.resetFields();
        form.setFieldsValue({ isActive: true, monthlyPrice: 0, yearlyPrice: 0, productLimit: 50, integrationLimit: 1, features: [] });
        setIsModalVisible(true);
    };

    const handleEdit = (record: any) => {
        setEditingPlan(record);
        form.setFieldsValue(record);
        setIsModalVisible(true);
    };

    const handleDelete = (id: string) => {
        Modal.confirm({
            title: 'Are you sure you want to delete this subscription plan?',
            onOk: async () => {
                try {
                    await AdminAPI.deleteSubscriptionPlan(id);
                    message.success('Plan deleted successfully');
                    fetchPlans();
                } catch (error) {
                    message.error('Failed to delete plan');
                }
            }
        });
    };

    const parseSubmit = async (values: any) => {
        try {
            if (editingPlan) {
                await AdminAPI.updateSubscriptionPlan(editingPlan.id, values);
                message.success('Plan updated successfully');
            } else {
                await AdminAPI.createSubscriptionPlan(values);
                message.success('Plan created successfully');
            }
            setIsModalVisible(false);
            fetchPlans();
        } catch (error: any) {
            const errMsg = error.response?.data?.error;
            message.error(typeof errMsg === 'string' ? errMsg : 'Operation failed');
        }
    };

    const columns = [
        { title: 'Paket Adı', dataIndex: 'name', key: 'name' },
        { title: 'Aylık (₺)', dataIndex: 'monthlyPrice', key: 'monthlyPrice', render: (val: any) => `${val} ₺` },
        { title: 'Yıllık (₺)', dataIndex: 'yearlyPrice', key: 'yearlyPrice', render: (val: any) => `${val} ₺` },
        { title: 'Ürün Limiti', dataIndex: 'productLimit', key: 'productLimit' },
        { title: 'Entegrasyon', dataIndex: 'integrationLimit', key: 'integrationLimit' },
        {
            title: 'Özellikler',
            dataIndex: 'features',
            key: 'features',
            render: (features: string[]) => (
                <>
                    {Array.isArray(features) && features.map((f: any, i: number) => (
                        <Tag key={i} color="blue">
                            {typeof f === 'string' ? f : JSON.stringify(f)}
                        </Tag>
                    ))}
                </>
            )
        },
        {
            title: 'Durum',
            dataIndex: 'isActive',
            key: 'isActive',
            render: (isActive: boolean) => <Tag color={isActive ? 'success' : 'error'}>{isActive ? 'Aktif' : 'Pasif'}</Tag>
        },
        {
            title: 'İşlemler',
            key: 'actions',
            render: (_: any, record: any) => (
                <Space>
                    <Button icon={<EditOutlined />} type="link" onClick={() => handleEdit(record)} />
                    <Button icon={<DeleteOutlined />} type="link" danger onClick={() => handleDelete(record.id)} />
                </Space>
            )
        }
    ];

    return (
        <Card title="Abonelik Paketleri" extra={<Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>Yeni Paket</Button>}>
            <Table
                dataSource={plans}
                columns={columns}
                rowKey="id"
                loading={loading}
                pagination={false}
            />

            <Modal
                title={editingPlan ? 'Paket Düzenle' : 'Yeni Paket'}
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                onOk={() => form.submit()}
                width={600}
            >
                <Form form={form} layout="vertical" onFinish={parseSubmit}>
                    <Form.Item name="name" label="Paket Adı" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>

                    <Form.Item name="description" label="Açıklama">
                        <Input.TextArea rows={2} />
                    </Form.Item>

                    <Space size="large" wrap>
                        <Form.Item name="monthlyPrice" label="Aylık Ücret (₺)" rules={[{ required: true }]}>
                            <InputNumber min={0} step={10} style={{ width: '130px' }} />
                        </Form.Item>

                        <Form.Item name="yearlyPrice" label="Yıllık Ücret (₺)" rules={[{ required: true }]}>
                            <InputNumber min={0} step={50} style={{ width: '130px' }} />
                        </Form.Item>

                        <Form.Item name="productLimit" label="Ürün Limiti" rules={[{ required: true }]}>
                            <InputNumber min={1} style={{ width: '130px' }} />
                        </Form.Item>

                        <Form.Item name="integrationLimit" label="Entegrasyon Limiti" rules={[{ required: true }]}>
                            <InputNumber min={0} style={{ width: '130px' }} />
                        </Form.Item>
                    </Space>

                    <Form.Item name="features" label="Özellikler (Enter ile ekleyin)">
                        <Select mode="tags" style={{ width: '100%' }} placeholder="Özellik yazıp Enter'a basın" />
                    </Form.Item>

                    <Form.Item name="isActive" label="Aktif mi?" valuePropName="checked">
                        <Switch />
                    </Form.Item>
                </Form>
            </Modal>
        </Card>
    );
};

export default SubscriptionsPage;
