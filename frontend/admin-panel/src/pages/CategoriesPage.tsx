import React, { useEffect, useState } from 'react';
import { Table, Card, Button, Space, Modal, Form, Input, Switch, message, Tabs, Tag, Select } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, TagsOutlined } from '@ant-design/icons';
import { AdminAPI } from '../services/api';

const { TabPane } = Tabs;

const LANGUAGES = [
  { key: 'en', label: 'English', flag: '🇺🇸' },
  { key: 'tr', label: 'Türkçe', flag: '🇹🇷' },
  { key: 'it', label: 'Italiano', flag: '🇮🇹' },
  { key: 'es', label: 'Español', flag: '🇪🇸' },
  { key: 'ar', label: 'العربية', flag: '🇸🇦' },
];

const emptyTranslations = LANGUAGES.reduce((acc, lang) => {
  acc[lang.key] = { name: '', description: '' };
  return acc;
}, {} as Record<string, any>);

const normalizeTranslations = (translations: any) => {
  const normalized = { ...emptyTranslations };
  Object.entries(translations || {}).forEach(([lang, data]) => {
    normalized[lang] = {
      ...normalized[lang],
      ...(data || {}),
    };
  });
  return normalized;
};

export const CategoriesPage: React.FC = () => {
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingCategory, setEditingCategory] = useState<any>(null);
    const [activeLang, setActiveLang] = useState('en');
    const [form] = Form.useForm();
    const [bulkVisible, setBulkVisible] = useState(false);
    const [bulkLoading, setBulkLoading] = useState(false);
    const [bulkOnlyGeneral, setBulkOnlyGeneral] = useState(true);
    const [bulkResult, setBulkResult] = useState<any>(null);

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
        form.setFieldsValue({ isActive: true, translations: normalizeTranslations({}) });
        setActiveLang('en');
        setIsModalVisible(true);
    };

    const handleEdit = (record: any) => {
        setEditingCategory(record);
        form.setFieldsValue({
            name: record.name,
            slug: record.slug,
            description: record.description,
            isActive: record.isActive !== false,
            keywords: record.keywords || [],
            translations: normalizeTranslations(record.translations),
        });
        setActiveLang('en');
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
            const payload = {
                name: values.name,
                slug: values.slug,
                description: values.description,
                isActive: values.isActive,
                keywords: values.keywords || [],
                translations: values.translations || {},
            };

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

    const runBulk = async (preview: boolean) => {
        setBulkLoading(true);
        try {
            const res = await AdminAPI.autoCategorizeProducts({ preview, onlyGeneral: bulkOnlyGeneral });
            setBulkResult(res);
            if (!preview) {
                message.success(`${res.updated} ürün kategorilendi`);
            } else if (res.scanned === 0) {
                message.info('Taranacak ürün yok — Genel/kategorisiz ürün kalmamış');
            }
        } catch (error: any) {
            const serverMsg = error?.response?.data?.error;
            message.error(typeof serverMsg === 'string' && serverMsg ? `Toplu kategorizasyon başarısız: ${serverMsg}` : 'Toplu kategorizasyon başarısız');
        } finally {
            setBulkLoading(false);
        }
    };

    const columns = [
        { title: 'Kategori Adı', dataIndex: 'name', key: 'name' },
        { title: 'Slug', dataIndex: 'slug', key: 'slug' },
        { title: 'Açıklama', dataIndex: 'description', key: 'description' },
        {
            title: 'Anahtar Kelimeler',
            key: 'keywords',
            render: (_: any, record: any) => (
                <span style={{ fontSize: 12, color: '#888' }}>
                    {Array.isArray(record.keywords) && record.keywords.length > 0
                        ? `${record.keywords.length} kelime`
                        : <span style={{ color: '#bbb' }}>varsayılan</span>}
                </span>
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
        <Card title="Kategori Yönetimi" extra={(
            <Space>
                <Button icon={<TagsOutlined />} onClick={() => { setBulkResult(null); setBulkVisible(true); }}>Toplu Kategorize</Button>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>Yeni Kategori</Button>
            </Space>
        )}>
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
                onOk={() => form.submit()}
                onCancel={() => setIsModalVisible(false)}
                width={800}
            >
                <Form form={form} layout="vertical" onFinish={parseSubmit}>
                    <Form.Item name="name" label="Kategori Adı" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>

                    <Form.Item name="slug" label="URL Slug" rules={[{ required: true }]}>
                        <Input disabled={!!editingCategory} />
                    </Form.Item>

                    <Form.Item name="description" label="Açıklama">
                        <Input.TextArea rows={3} />
                    </Form.Item>

                    <Form.Item name="keywords" label="Otomatik Tanıma Anahtar Kelimeleri (TR+EN, virgülle ayırıp Enter'a bas)">
                        <Select mode="tags" tokenSeparators={[',']} placeholder="ör. yüzük, ring, tektaş" />
                    </Form.Item>

                    <div style={{ marginBottom: 16 }}>
                        <Tabs activeKey={activeLang} onChange={setActiveLang} type="card">
                            {LANGUAGES.map(lang => (
                                <TabPane tab={<span>{lang.flag} {lang.label}</span>} key={lang.key} />
                            ))}
                        </Tabs>
                    </div>

                    <Form.Item name={['translations', activeLang, 'name']} label={`Kategori Adı (${activeLang.toUpperCase()})`} rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>

                    <Form.Item name={['translations', activeLang, 'description']} label={`Açıklama (${activeLang.toUpperCase()})`}>
                        <Input.TextArea rows={3} />
                    </Form.Item>

                    <Form.Item name="isActive" label="Aktif mi?" valuePropName="checked">
                        <Switch />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title="Toplu Otomatik Kategorize"
                open={bulkVisible}
                onCancel={() => setBulkVisible(false)}
                width={900}
                footer={[
                    <Button key="preview" loading={bulkLoading} onClick={() => runBulk(true)}>Önizle</Button>,
                    <Button key="apply" type="primary" loading={bulkLoading} onClick={() => runBulk(false)}>Uygula</Button>,
                ]}
            >
                <Space style={{ marginBottom: 12 }}>
                    <span>Sadece Genel/kategorisiz ürünler:</span>
                    <Switch checked={bulkOnlyGeneral} onChange={setBulkOnlyGeneral} />
                </Space>
                {bulkResult && (
                    <>
                        <p>
                            Taranan: <b>{bulkResult.scanned}</b> — Eşleşen: <b>{bulkResult.matched}</b>
                            {bulkResult.updated ? <> — Güncellenen: <b>{bulkResult.updated}</b></> : null}
                            {' '}— Eşleşmeyen: <b>{String(bulkResult.unmatchedCount)}</b>
                        </p>
                        <Table
                            dataSource={bulkResult.matches || []}
                            rowKey="id"
                            pagination={{ pageSize: 8 }}
                            columns={[
                                { title: 'SKU', dataIndex: 'sku', key: 'sku', width: 140 },
                                { title: 'Ürün', dataIndex: 'title', key: 'title' },
                                { title: 'Eski', dataIndex: 'from', key: 'from', width: 100, render: (v: string) => v || '—' },
                                { title: 'Yeni', dataIndex: 'to', key: 'to', width: 100 },
                            ]}
                        />
                    </>
                )}
            </Modal>
        </Card>
    );
};

export default CategoriesPage;
