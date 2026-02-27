import React, { useEffect, useState } from 'react';
import { Table, Card, Button, Space, Modal, Form, Input, Select, Switch, message, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { AdminAPI } from '../services/api';

export const UsersPage: React.FC = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [form] = Form.useForm();

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const data = await AdminAPI.getUsers();
            setUsers(data);
        } catch (error) {
            message.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleAdd = () => {
        setEditingUser(null);
        form.resetFields();
        form.setFieldsValue({ isActive: true, userType: 'customer' });
        setIsModalVisible(true);
    };

    const handleEdit = (record: any) => {
        setEditingUser(record);
        form.setFieldsValue(record);
        setIsModalVisible(true);
    };

    const handleDelete = (id: string) => {
        Modal.confirm({
            title: 'Are you sure you want to delete this user?',
            onOk: async () => {
                try {
                    await AdminAPI.deleteUser(id);
                    message.success('User deleted successfully');
                    fetchUsers();
                } catch (error) {
                    message.error('Failed to delete user');
                }
            }
        });
    };

    const parseSubmit = async (values: any) => {
        try {
            if (editingUser) {
                await AdminAPI.updateUser(editingUser.id, values);
                message.success('User updated successfully');
            } else {
                await AdminAPI.createUser(values);
                message.success('User created successfully');
            }
            setIsModalVisible(false);
            fetchUsers();
        } catch (error: any) {
            message.error(error.response?.data?.error || 'Operation failed');
        }
    };

    const columns = [
        { title: 'Ad Soyad', key: 'name', render: (_: any, record: any) => `${record.firstName} ${record.lastName}` },
        { title: 'E-posta', dataIndex: 'email', key: 'email' },
        { title: 'Telefon', dataIndex: 'phone', key: 'phone' },
        {
            title: 'Tip',
            dataIndex: 'userType',
            key: 'userType',
            render: (type: string) => {
                const colors: any = { admin: 'red', seller: 'blue', customer: 'green' };
                return <Tag color={colors[type]}>{type.toUpperCase()}</Tag>;
            }
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
        <Card title="Kullanıcı Yönetimi" extra={<Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>Yeni Kullanıcı</Button>}>
            <Table
                dataSource={users}
                columns={columns}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 10 }}
            />

            <Modal
                title={editingUser ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı'}
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                onOk={() => form.submit()}
            >
                <Form form={form} layout="vertical" onFinish={parseSubmit}>
                    <Form.Item name="firstName" label="Ad" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="lastName" label="Soyad" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="email" label="E-posta" rules={[{ required: true, type: 'email' }]}>
                        <Input />
                    </Form.Item>
                    {!editingUser && (
                        <Form.Item name="password" label="Şifre" rules={[{ required: true, min: 6 }]}>
                            <Input.Password />
                        </Form.Item>
                    )}
                    {editingUser && (
                        <Form.Item name="password" label="Yeni Şifre (Boş bırakılabilir)">
                            <Input.Password placeholder="Değiştirmek istemiyorsanız boş bırakın" />
                        </Form.Item>
                    )}
                    <Form.Item name="phone" label="Telefon">
                        <Input />
                    </Form.Item>
                    <Form.Item name="userType" label="Kullanıcı Tipi" rules={[{ required: true }]}>
                        <Select>
                            <Select.Option value="customer">Customer</Select.Option>
                            <Select.Option value="seller">Seller</Select.Option>
                            <Select.Option value="admin">Admin</Select.Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="isActive" label="Aktif mi?" valuePropName="checked">
                        <Switch />
                    </Form.Item>
                </Form>
            </Modal>
        </Card>
    );
};

export default UsersPage;
