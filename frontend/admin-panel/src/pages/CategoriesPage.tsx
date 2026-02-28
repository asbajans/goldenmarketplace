import React, { useEffect, useState } from 'react';
import { Table, Card, Button, Space, Modal, Form, Input, Switch, message, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { AdminAPI } from '../services/api';

export const CategoriesPage: React.FC = () => {
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingCategory, setEditingCategory] = useState<any>(null);
    const [form] = Form.useForm();

    const fetchCategories = async () => {
        setLoading(true);
        try {
            const data = await AdminAPI.getCategories();
            setCategories(Array.isArray(data) ? data : []);
        } catch (error) {
            message.error('Failed to load categories');
            setCategories([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const handleAdd = () => {
        setEditingCategory(null);
        form.resetFields();
        form.setFieldsValue({ isActive: true });
        setIsModalVisible(true);
    };

    const handleEdit = (record: any) => {
        setEditingCategory(record);
        form.setFieldsValue(record);
        setIsModalVisible(true);
    };

    const handleDelete = (id: string) => {
        Modal.confirm({
            title: 'Are you sure you want to delete this category?',
            onOk: async () => {
                try {
                    await AdminAPI.deleteCategory(id);
                    message.success('Category deleted successfully');
                    fetchCategories();
                } catch (error) {
                    message.error('Failed to delete category');
                }
            }
        });
    };

    const parseSubmit = async (values: any) => {
        try {
            if (editingCategory) {
                await AdminAPI.updateCategory(editingCategory.id, values);
                message.success('Category updated successfully');
            } else {
                await AdminAPI.createCategory(values);
                message.success('Category created successfully');
            }
            setIsModalVisible(false);
            fetchCategories();
        } catch (error: any) {
            const errMsg = error.response?.data?.error;
            message.error(typeof errMsg === 'string' ? errMsg : 'Operation failed');
        }
    };

    const columns = [
        { title: 'Kategori Adı', dataIndex: 'name', key: 'name' },
        { title: 'Slug', dataIndex: 'slug', key: 'slug' },
        { title: 'Açıklama', dataIndex: 'description', key: 'description' },
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
        <Card title="Kategori Yönetimi" extra={<Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>Yeni Kategori</Button>}>
            <Table
                dataSource={categories}
                columns={columns}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 10 }}
            />

            <Modal
                title={editingCategory ? 'Kategori Düzenle' : 'Yeni Kategori'}
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                onOk={() => form.submit()}
            >
                <Form form={form} layout="vertical" onFinish={parseSubmit}>
                    <Form.Item name="name" label="Kategori Adı" rules={[{ required: true }]}>
                        <Input onChange={(e) => {
                            if (!editingCategory) {
                                form.setFieldsValue({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-') });
                            }
                        }} />
                    </Form.Item>

                    <Form.Item name="slug" label="URL Slug" rules={[{ required: true }]}>
                        <Input disabled={!!editingCategory} />
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

export default CategoriesPage;
