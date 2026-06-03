import { useEffect, useState } from 'react';
import { Card, Form, Input, Button, message, Row, Col, Typography } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { AdminAPI } from '../services/api';

const { Text, Title } = Typography;

const TRACKING_FIELDS = [
  {
    group: 'Meta / Facebook',
    icon: '📘',
    fields: [
      { key: 'facebook_pixel_id', label: 'Facebook Pixel ID', placeholder: '123456789012345' },
      { key: 'meta_business_id', label: 'Meta Business ID', placeholder: '123456789012345' },
      { key: 'facebook_catalog_id', label: 'Facebook Catalog ID', placeholder: '123456789012345' },
      { key: 'instagram_business_account_id', label: 'Instagram Business Account ID', placeholder: '17841400000000000' },
      { key: 'instagram_shop_id', label: 'Instagram Shop ID', placeholder: '123456789012345' },
    ],
  },
  {
    group: 'Google',
    icon: '🔍',
    fields: [
      { key: 'google_gtm_id', label: 'Google Tag Manager ID', placeholder: 'GTM-XXXXXXX' },
      { key: 'google_analytics_id', label: 'Google Analytics GA4 ID', placeholder: 'G-XXXXXXXXXX' },
    ],
  },
  {
    group: 'Google Merchant Center',
    icon: '🛒',
    fields: [
      { key: 'merchant_center_id', label: 'Merchant Center ID', placeholder: '123456789' },
      { key: 'merchant_target_country', label: 'Hedef Ülke', placeholder: 'TR' },
      { key: 'merchant_target_language', label: 'Hedef Dil', placeholder: 'tr' },
    ],
    extra: (
      <div style={{ marginTop: 12, padding: '8px 12px', background: '#f5f5f5', borderRadius: 6, fontSize: 13 }}>
        <strong>Feed URL'leri:</strong><br />
        Google Shopping: <code>/api/feed/google.xml</code><br />
        Facebook Catalog: <code>/api/feed/facebook.json</code><br />
        Instagram: <code>/api/feed/instagram.json</code><br />
        <small>Bu URL'leri Merchant Center / Commerce Manager'da ürün feed'i olarak ekleyin.</small>
      </div>
    ),
  },
  {
    group: 'TikTok',
    icon: '🎵',
    fields: [
      { key: 'tiktok_pixel_id', label: 'TikTok Pixel ID', placeholder: 'CGQKRKRC77UB2AM7Q0SG' },
    ],
  },
];

export default function PixelsTrackingPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTrackingSettings();
  }, []);

  const fetchTrackingSettings = async () => {
    try {
      setLoading(true);
      const data = await AdminAPI.getSettings();
      const formValues: Record<string, string> = {};
      for (const group of TRACKING_FIELDS) {
        for (const field of group.fields) {
          formValues[field.key] = data[field.key] || '';
        }
      }
      form.setFieldsValue(formValues);
    } catch (error) {
      message.error('Ayarlar yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const values = form.getFieldsValue();
      await AdminAPI.updateSettings(values);
      message.success('Tracking ayarları kaydedildi!');
    } catch (error) {
      message.error('Kaydetme hatası.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Pixels & Tracking</Title>
          <Text type="secondary">Facebook Pixel, Google Tag Manager, TikTok Pixel ve diğer tracking ayarlarını yönetin.</Text>
        </div>
        <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving} size="large">
          Tümünü Kaydet
        </Button>
      </div>

      {loading ? (
        <Card loading />
      ) : (
        <Form form={form} layout="vertical">
          {TRACKING_FIELDS.map(group => (
            <Card
              key={group.group}
              title={<span>{group.icon} {group.group}</span>}
              style={{ marginBottom: 16 }}
            >
              <Row gutter={[24, 0]}>
                {group.fields.map(field => (
                  <Col xs={24} sm={12} lg={8} key={field.key}>
                    <Form.Item name={field.key} label={field.label}>
                      <Input placeholder={field.placeholder} />
                    </Form.Item>
                  </Col>
                ))}
              </Row>
              {(group as any).extra && <div>{(group as any).extra}</div>}
            </Card>
          ))}
        </Form>
      )}
    </div>
  );
}