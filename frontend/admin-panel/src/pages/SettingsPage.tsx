import React, { useEffect, useState } from 'react';
import { Card, Form, Input, Button, message, Divider, Spin } from 'antd';
import { AdminAPI } from '../services/api';

export default function SettingsPage() {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const data = await AdminAPI.getSettings();
            form.setFieldsValue(data);
        } catch (error) {
            message.error('Ayarlar yüklenemedi.');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (values: any) => {
        try {
            setSaving(true);
            await AdminAPI.updateSettings(values);
            message.success('Ayarlar başarıyla kaydedildi!');
        } catch (error) {
            message.error('Ayarlar kaydedilirken bir hata oluştu.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <Spin size="large" style={{ display: 'flex', justifyContent: 'center', marginTop: 100 }} />;
    }

    return (
        <Card title="Sistem Ayarları" bordered={false}>
            <Form
                form={form}
                layout="vertical"
                onFinish={handleSave}
            >
                <Divider orientation="left">Etsy Entegrasyon Ayarları (Master App)</Divider>
                <p style={{ color: '#888', marginBottom: 20 }}>
                    Satıcıların OAuth üzerinden Etsy'ye bağlanabilmesi için sizin ana uygulamanızın (Master App) API anahtarlarını aşağıya girmelisiniz.
                </p>

                <Form.Item
                    name="etsy_api_key"
                    label="Etsy Keystring (Client ID)"
                    rules={[{ required: true, message: 'Lütfen Etsy Keystring değerini girin' }]}
                >
                    <Input placeholder="Etsy Developer Portal'dan aldığınız Keystring" />
                </Form.Item>

                <Form.Item
                    name="etsy_api_secret"
                    label="Etsy Shared Secret"
                    rules={[{ required: true, message: 'Lütfen Etsy Shared Secret değerini girin' }]}
                >
                    <Input.Password placeholder="Etsy Developer Portal'dan aldığınız Shared Secret" />
                </Form.Item>

                <Divider orientation="left">Diğer Ayarlar</Divider>
                <p style={{ color: '#888', marginBottom: 20 }}>
                    İlerleyen zamanda platform genelindeki diğer tüm global ayarları buraya ekleyebilirsiniz.
                </p>

                <Form.Item>
                    <Button type="primary" htmlType="submit" loading={saving}>
                        Ayarları Kaydet
                    </Button>
                </Form.Item>
            </Form>
        </Card>
    );
}
