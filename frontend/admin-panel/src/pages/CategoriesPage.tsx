import React, { useEffect, useState } from 'react';
import { Table, Card, Button, Space, Modal, Form, Input, Switch, message, Tag, Tabs } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { AdminAPI } from '../services/api';

const { TabPane } = Tabs;

const LANGUAGES = [
  { key: 'en', label: 'English', flag: '🇺🇸' },
  { key: 'tr', label: 'Türkçe', flag: '🇹🇷' },
  { key: 'it', label: 'Italiano', flag: '🇮🇹' },
  { key: 'es', label: 'Español', flag: '🇪🇸' },
  { key: 'ar', label: 'العربية', flag: '🇸🇦' },
];

export const CategoriesPage: React.FC = () => {
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingCategory, setEditingCategory] = useState<any>(null);
    const [activeLang, setActiveLang] = useState('en');
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
        setActiveLang('en');
        setIsModalVisible(true);
    };

    const handleEdit = (record: any) => {
        setEditingCategory(record);
        const translations = record.translations || {};
        form.setFieldsValue({
            name: record.name,
            slug: record.slug,
            description: record.description,
            isActive: record.isActive,
            ...Object.entries(translations).flatMap(([lang, t]: [string, any]) => [
                [`trans_name_${lang}`, t.name || ''],
                [`trans_desc_${lang}`, t.description || ''],
            ]),
        });
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
        const translations: Record<string, any> = {};
        for (const lang of LANGUAGES) {
            const tName = values[`trans_name_${lang.key}`];
            const tDesc = values[`trans_desc_${lang.key}`];
            translations[lang.key] = { name: tName || '', description: tDesc || '' };
        }

        const payload = {
            name: values.name,
            slug: values.slug,
            description: values.description,
            isActive: values.isActive,
            translations,
        };

        try {
            if (editingCategory) {
                await AdminAPI.updateCategory(editingCategory.id, payload);
                message.success('Category updated successfully');
            } else {
                await AdminAPI.createCategory(payload);
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
        { title: 'Açıklama', dataIndex: 'description', key: 'description', ellipsis: true },
        {
            title: 'Çeviriler',
            key: 'translations',
            render: (_: any, record: any) => {
                const t = record.translations || {};
                return LANGUAGES.map(l => t[l.key]?.name ? `${l.flag}${t[l.key].name}` : null).filter(Boolean).join(', ');
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
                width={700}
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
                        <Input.TextArea rows={2} />
                    </Form.Item>

                    <Form.Item name="isActive" label="Aktif mi?" valuePropName="checked">
                        <Switch />
                    </Form.Item>

                    <Tabs activeKey={activeLang} onChange={setActiveLang} type="card">
                        {LANGUAGES.map(lang => (
                            <TabPane tab={<span>{lang.flag} {lang.label}</span>} key={lang.key}>
                                <Form.Item name={`trans_name_${lang.key}`} label={`${lang.label} - Ad`}>
                                    <Input placeholder={`Category name in ${lang.label}`} />
                                </Form.Item>
                                <Form.Item name={`trans_desc_${lang.key}`} label={`${lang.label} - Açıklama`}>
                                    <Input.TextArea rows={2} placeholder={`Description in ${lang.label}`} />
                                </Form.Item>
                            </TabPane>
                        ))}
                    </Tabs>
                </Form>
            </Modal>
        </Card>
    );
};

export default CategoriesPage;