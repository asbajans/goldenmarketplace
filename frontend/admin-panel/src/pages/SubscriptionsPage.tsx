import React, { useEffect, useState } from 'react';
import { Table, Card, Button, Space, Modal, Form, Input, InputNumber, Switch, message, Tag, Select, Tabs } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { AdminAPI } from '../services/api';

const { Option } = Select;

export const SubscriptionsPage: React.FC = () => {
    const [plans, setPlans] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingPlan, setEditingPlan] = useState<any>(null);
    const [form] = Form.useForm();
    const [assignForm] = Form.useForm();
    const [isAssignModalVisible, setIsAssignModalVisible] = useState(false);
    const [assigningUser, setAssigningUser] = useState<any>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [plansRes, usersRes] = await Promise.all([
                AdminAPI.getSubscriptionPlans(),
                AdminAPI.getUsers()
            ]);
            setPlans(plansRes);
            // Filter only sellers to assign plans
            setUsers((usersRes.data || []).filter((u: any) => u.userType === 'seller'));
        } catch (error) {
            message.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAdd = () => {
        setEditingPlan(null);
        form.resetFields();
        form.setFieldsValue({ isActive: true, price: 0, productLimit: 50, features: [] });
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
                    fetchData();
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
            fetchData();
        } catch (error: any) {
            const errMsg = error.response?.data?.error;
            message.error(typeof errMsg === 'string' ? errMsg : 'Operation failed');
        }
    };

    const handleAssignPlan = (record: any) => {
        setAssigningUser(record);
        const userPlan = plans.find(p => p.name === record.subscriptionPlan);
        assignForm.setFieldsValue({
            subscriptionPlanId: userPlan?.id,
            subscriptionStatus: record.subscriptionStatus || 'active'
        });
        setIsAssignModalVisible(true);
    };

    const submitAssignPlan = async (values: any) => {
        if (!assigningUser) return;
        try {
            await AdminAPI.assignPlanToUser(assigningUser.id, values);
            message.success('Paket başarıyla atandı');
            setIsAssignModalVisible(false);
            fetchData();
        } catch (error) {
            message.error('Paket atanamadı');
        }
    };

    const planColumns = [
        { title: 'Paket Adı', dataIndex: 'name', key: 'name' },
        { title: 'Ücret (₺)', dataIndex: 'price', key: 'price', render: (val: any) => `${val} ₺` },
        { title: 'Ürün Limiti', dataIndex: 'productLimit', key: 'productLimit' },
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

    const assignmentColumns = [
        { title: 'Satıcı Adı', key: 'name', render: (_: any, r: any) => `${r.firstName} ${r.lastName}` },
        { title: 'E-Posta', dataIndex: 'email', key: 'email' },
        { 
            title: 'Mevcut Paket', 
            dataIndex: 'subscriptionPlan', 
            key: 'subscriptionPlan',
            render: (val: string) => val ? <Tag color="purple">{val}</Tag> : <Tag color="default">Yok (Varsayılan 5 Limit)</Tag>
        },
        { 
            title: 'Durum', 
            dataIndex: 'subscriptionStatus', 
            key: 'subscriptionStatus',
            render: (val: string) => <Tag color={val === 'active' ? 'success' : 'warning'}>{val || 'N/A'}</Tag>
        },
        {
            title: 'İşlem',
            key: 'actions',
            render: (_: any, record: any) => (
                <Button type="primary" size="small" onClick={() => handleAssignPlan(record)}>Paket Ata</Button>
            )
        }
    ];

    const tabItems = [
        {
            key: 'plans',
            label: 'Paket Tanımları',
            children: (
                <Card title="Abonelik Paketleri" extra={<Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>Yeni Paket</Button>}>
                    <Table dataSource={plans} columns={planColumns} rowKey="id" loading={loading} pagination={false} />
                </Card>
            )
        },
        {
            key: 'assignments',
            label: 'Üye Paket Atamaları',
            children: (
                <Card title="Satıcı Paket Atamaları">
                    <Table dataSource={users} columns={assignmentColumns} rowKey="id" loading={loading} pagination={{ pageSize: 15 }} />
                </Card>
            )
        }
    ];

    return (
        <div>
            <Tabs defaultActiveKey="plans" items={tabItems} />

            {/* Edit Plan Modal */}
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

                    <Space size="large">
                        <Form.Item name="price" label="Aylık Ücret (₺)" rules={[{ required: true }]}>
                            <InputNumber min={0} step={10} style={{ width: '150px' }} />
                        </Form.Item>

                        <Form.Item name="productLimit" label="Ürün Limiti" rules={[{ required: true }]}>
                            <InputNumber min={1} style={{ width: '150px' }} />
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

            {/* Assign Plan Modal */}
            <Modal
                title={`Paket Ata: ${assigningUser?.firstName} ${assigningUser?.lastName}`}
                open={isAssignModalVisible}
                onCancel={() => setIsAssignModalVisible(false)}
                onOk={() => assignForm.submit()}
            >
                <Form form={assignForm} layout="vertical" onFinish={submitAssignPlan}>
                    <Form.Item name="subscriptionPlanId" label="Abonelik Paketi">
                        <Select placeholder="Paket Seçiniz" allowClear>
                            {plans.map(p => (
                                <Option key={p.id} value={p.id}>{p.name} (Limit: {p.productLimit})</Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item name="subscriptionStatus" label="Abonelik Durumu">
                        <Select>
                            <Option value="active">Aktif</Option>
                            <Option value="inactive">Pasif / Beklemede</Option>
                            <Option value="past_due">Son Ödeme Gecikti</Option>
                            <Option value="canceled">İptal Edildi</Option>
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default SubscriptionsPage;
