import React, { useEffect, useState } from 'react';
import { Table, Card, Button, message, Tag, Space, Modal, Form, Input, InputNumber, Switch, Popconfirm, Alert, Select, Tabs } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { AdminAPI } from '../services/api';

const { TabPane } = Tabs;

const LANGS = [
    { key: 'en', label: 'English', flag: '🇺🇸' },
    { key: 'tr', label: 'Türkçe', flag: '🇹🇷' },
    { key: 'it', label: 'Italiano', flag: '🇮🇹' },
    { key: 'es', label: 'Español', flag: '🇪🇸' },
    { key: 'ar', label: 'العربية', flag: '🇸🇦' },
];

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
    const [activeLang, setActiveLang] = useState('en');
    const [cutList, setCutList] = useState<string[]>([]);
    const [qualityList, setQualityList] = useState<string[]>([]);
    const [listsSaving, setListsSaving] = useState(false);

    const parseListSetting = (raw: any): string[] => {
        try {
            const arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
            return Array.isArray(arr) ? arr.map((x: any) => String(x)) : [];
        } catch {
            return [];
        }
    };

    const fetchLists = async () => {
        try {
            const settings = await AdminAPI.getSettings();
            setCutList(parseListSetting(settings.gemstone_cuts));
            setQualityList(parseListSetting(settings.gemstone_qualities));
        } catch {
            // sessiz
        }
    };

    const saveLists = async () => {
        setListsSaving(true);
        try {
            await AdminAPI.updateSettings({
                gemstone_cuts: JSON.stringify(cutList),
                gemstone_qualities: JSON.stringify(qualityList)
            });
            message.success('Listeler kaydedildi!');
        } catch {
            message.error('Kaydetme hatası');
        } finally {
            setListsSaving(false);
        }
    };

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

    useEffect(() => { fetchStones(); fetchLists(); }, []);

    const handleAdd = () => {
        setEditing(null);
        form.resetFields();
        form.setFieldsValue({ pricePerCaratUSD: 0, isActive: true, cutLines: 'baget=1.2\nmarkiz=1.15\noval=1.1\nprenses=1.1', qualityLines: '', translations: {} });
        setActiveLang('en');
        setModalVisible(true);
    };

    const handleEdit = (record: any) => {
        setEditing(record);
        form.setFieldsValue({
            ...record,
            cutLines: objToLines(record.cutMultipliers),
            qualityLines: objToLines(record.qualityMultipliers),
            translations: record.translations || {}
        });
        setActiveLang('en');
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
        <>
        <Card title="Kesim & Özellik Listeleri" style={{ marginBottom: 16 }} extra={<Button type="primary" loading={listsSaving} onClick={saveLists}>Listeleri Kaydet</Button>}>
            <Alert
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
                message="Satıcılar ürün taşında kesim/özelliği bu listelerden seçer (serbest yazı yok)."
            />
            <Space size="large" wrap style={{ width: '100%' }}>
                <div style={{ minWidth: 280 }}>
                    <div style={{ marginBottom: 8, fontWeight: 600 }}>Kesimler</div>
                    <Select
                        mode="tags"
                        style={{ width: '100%' }}
                        value={cutList}
                        onChange={setCutList}
                        placeholder="baget, markiz..."
                        tokenSeparators={[',']}
                    />
                </div>
                <div style={{ minWidth: 280 }}>
                    <div style={{ marginBottom: 8, fontWeight: 600 }}>Özellikler</div>
                    <Select
                        mode="tags"
                        style={{ width: '100%' }}
                        value={qualityList}
                        onChange={setQualityList}
                        placeholder="FG/SI, VS1..."
                        tokenSeparators={[',']}
                    />
                </div>
            </Space>
        </Card>
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
                    <Form.Item name="name" label="Taş Adı (varsayılan)" rules={[{ required: true }]}>
                        <Input placeholder="Pırlanta, Yakut, Zümrüt..." />
                    </Form.Item>

                    <Tabs activeKey={activeLang} onChange={setActiveLang} type="card" style={{ marginBottom: 16 }}>
                        {LANGS.map(lang => (
                            <TabPane tab={<span>{lang.flag} {lang.label}</span>} key={lang.key} />
                        ))}
                    </Tabs>
                    <Form.Item name={['translations', activeLang, 'name']} label={`Taş Adı (${activeLang.toUpperCase()})`}>
                        <Input placeholder="Boşsa varsayılan ad kullanılır" />
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
        </>
    );
};

export default GemstonesPage;
