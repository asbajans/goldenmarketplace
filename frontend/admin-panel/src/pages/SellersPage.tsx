import React, { useEffect, useState } from 'react';
import { Table, Card, Button, Space, Modal, Form, Input, Switch, message, Tag, Select } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { AdminAPI } from '../services/api';

export const SellersPage: React.FC = () => {
    const [stores, setStores] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingStore, setEditingStore] = useState<any>(null);
    const [form] = Form.useForm();

    const fetchStores = async () => {
        setLoading(true);
        try {
            const data = await AdminAPI.getStores();
            setStores(data);
        } catch (error) {
            message.error('Failed to load stores');
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const data = await AdminAPI.getUsers();
            // Filters for sellers only or let admin select any? Usually better to only show userType=seller
            setUsers(data.filter((u: any) => u.userType === 'seller' || u.userType === 'admin'));
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        fetchStores();
        fetchUsers();
    }, []);

    const handleAdd = () => {
        setEditingStore(null);
        form.resetFields();
        form.setFieldsValue({ isActive: true });
        setIsModalVisible(true);
    };

    const handleEdit = (record: any) => {
        setEditingStore(record);
        form.setFieldsValue(record);
        setIsModalVisible(true);
    };

    const handleDelete = (id: string) => {
        Modal.confirm({
            title: 'Are you sure you want to delete this store?',
            onOk: async () => {
                try {
                    await AdminAPI.deleteStore(id);
                    message.success('Store deleted successfully');
                    fetchStores();
                } catch (error) {
                    message.error('Failed to delete store');
                }
            }
        });
    };

    const parseSubmit = async (values: any) => {
        try {
            if (editingStore) {
                await AdminAPI.updateStore(editingStore.id, values);
                message.success('Store updated successfully');
            } else {
                await AdminAPI.createStore(values);
                message.success('Store created successfully');
            }
            setIsModalVisible(false);
            fetchStores();
        } catch (error: any) {
            message.error(error.response?.data?.error || 'Operation failed');
        }
    };

    const columns = [
        { title: 'Mağaza Adı', dataIndex: 'storeName', key: 'storeName' },
        { title: 'Slug', dataIndex: 'storeSlug', key: 'storeSlug' },
        {
            title: 'Kullanıcı (Sahip)',
            dataIndex: 'user',
            key: 'user',
            render: (user: any) => user ? `${user.firstName} ${user.lastName}` : '-'
        },
        { title: 'Ürün Sayısı', dataIndex: 'totalProducts', key: 'totalProducts' },
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
        <Card title="Satıcı (Mağaza) Yönetimi" extra={<Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>Yeni Mağaza</Button>}>
            <Table
                dataSource={stores}
                columns={columns}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 10 }}
            />

            <Modal
                title={editingStore ? 'Mağaza Düzenle' : 'Yeni Mağaza'}
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                onOk={() => form.submit()}
            >
                <Form form={form} layout="vertical" onFinish={parseSubmit}>
                    {!editingStore && (
                        <Form.Item name="userId" label="Mağaza Sahibi (Kullanıcı)" rules={[{ required: true }]}>
                            <Select showSearch optionFilterProp="children">
                                {users.map(u => (
                                    <Select.Option key={u.id} value={u.id}>
                                        {u.firstName} {u.lastName} ({u.email})
                                    </Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                    )}

                    <Form.Item name="storeName" label="Mağaza Adı" rules={[{ required: true }]}>
                        <Input onChange={(e) => {
                            if (!editingStore) {
                                form.setFieldsValue({ storeSlug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-') });
                            }
                        }} />
                    </Form.Item>

                    <Form.Item name="storeSlug" label="URL Slug" rules={[{ required: true }]}>
                        <Input disabled={!!editingStore} />
                    </Form.Item>

                    <Form.Item name="description" label="Açıklama">
                        <Input.TextArea rows={3} />
                    </Form.Item>

                    <Form.Item name="isActive" label="Aktif mi?" valuePropName="checked">
                        <Switch />
                    </Form.Item>
                </Form>
            </Modal>
        </Card>
    );
};

export default SellersPage;
