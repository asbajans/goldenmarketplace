import React, { useState, useEffect } from 'react';
import {
  Card, Table, Button, Modal, Form, Input, Select, Switch, message, Tag, Space, Typography,
  Steps, Descriptions, Divider, Alert, Radio, InputNumber, Row, Col, Tooltip, Popconfirm, Badge
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, SyncOutlined, LinkOutlined,
  CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined,
  SettingOutlined, EyeOutlined, ThunderboltOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getFeeds, createFeed, updateFeed, deleteFeed, testFeed, syncFeed, ExternalFeed } from '../api/externalFeeds';

const { Title, Text } = Typography;
const { Option } = Select;
const { Step } = Steps;

const AUTH_TYPES = [
  { value: 'none', label: 'Auth Yok' },
  { value: 'basic', label: 'Basic Auth' },
  { value: 'bearer', label: 'Bearer Token' },
  { value: 'api-key', label: 'API Key' },
];

const FILE_FORMATS = [
  { value: 'xml', label: 'XML' },
  { value: 'csv', label: 'CSV' },
  { value: 'xlsx', label: 'Excel (XLSX)' },
  { value: 'json', label: 'JSON' },
];

const INTERVALS = [
  { value: 'manual', label: 'Manuel' },
  { value: 'hourly', label: 'Saatlik' },
  { value: 'daily', label: 'Günlük' },
  { value: 'weekly', label: 'Haftalık' },
];

const ExternalFeeds: React.FC = () => {
  const [feeds, setFeeds] = useState<ExternalFeed[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingFeed, setEditingFeed] = useState<ExternalFeed | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm();
  const [testResult, setTestResult] = useState<{ headers: string[]; sampleData: any[]; total: number } | null>(null);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchFeeds();
  }, []);

  const fetchFeeds = async () => {
    setLoading(true);
    try {
      const data = await getFeeds();
      setFeeds(data || []);
    } catch {
      message.error('Feed listesi alınamadı');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingFeed(null);
    setCurrentStep(0);
    setTestResult(null);
    form.resetFields();
    form.setFieldsValue({
      fileFormat: 'xml',
      authType: 'none',
      pricingMode: 'fixed',
      currency: 'TRY',
      priceMultiplier: 1,
      updateInterval: 'manual',
      autoSync: false,
      isActive: true,
      defaultQuantity: 1,
      defaultIsB2BEnabled: false,
      defaultProfitMargin: 0
    });
    setModalVisible(true);
  };

  const handleEdit = (feed: ExternalFeed) => {
    setEditingFeed(feed);
    setCurrentStep(0);
    setTestResult(null);
    form.setFieldsValue(feed);
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteFeed(id);
      message.success('Feed pasife alındı');
      fetchFeeds();
    } catch {
      message.error('Feed silinemedi');
    }
  };

  const handleTest = async () => {
    const values = await form.validateFields();
    setTesting(true);
    try {
      let feedId: string;
      if (editingFeed) {
        feedId = editingFeed.id;
        await updateFeed(feedId, values);
      } else {
        const result = await createFeed(values);
        feedId = result.data.id;
        setEditingFeed(result.data);
      }
      const result = await testFeed(feedId);
      setTestResult(result);
      message.success(`Feed test başarılı! ${result.total} ürün bulundu.`);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err.message || 'Test başarısız';
      message.error(msg);
    } finally {
      setTesting(false);
    }
  };

  const handleSync = async (id: string) => {
    setSyncing(id);
    try {
      const result = await syncFeed(id);
      message.success(result.message);
      setTimeout(fetchFeeds, 2000);
    } catch {
      message.error('Senkronizasyon başlatılamadı');
    } finally {
      setSyncing(null);
    }
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    try {
      if (editingFeed) {
        await updateFeed(editingFeed.id, values);
        message.success('Feed güncellendi');
      } else {
        if (!testResult) {
          message.warning('Lütfen önce feed\'i test edin');
          return;
        }
        await createFeed(values);
        message.success('Feed oluşturuldu');
      }
      setModalVisible(false);
      fetchFeeds();
    } catch (err: any) {
      const msg = err?.response?.data?.error || err.message || 'İşlem başarısız';
      message.error(msg);
    }
  };

  const handleNext = async () => {
    if (currentStep === 0) {
      await form.validateFields(['feedUrl', 'fileFormat', 'authType']);
      if (!editingFeed) {
        message.warning('Lütfen önce "Test Et" butonuna basarak feed\'i doğrulayın');
        return;
      }
    }
    setCurrentStep(s => Math.min(s + 1, 3));
  };

  const columns = [
    {
      title: 'Feed Adı',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: ExternalFeed) => (
        <Space>
          <LinkOutlined style={{ color: '#d4a017' }} />
          <a onClick={() => navigate(`/feeds/${record.id}`)}>{name || 'İsimsiz'}</a>
        </Space>
      )
    },
    { title: 'URL', dataIndex: 'feedUrl', key: 'feedUrl', ellipsis: true, width: 250 },
    {
      title: 'Format',
      dataIndex: 'fileFormat',
      key: 'fileFormat',
      render: (fmt: string) => <Tag>{fmt?.toUpperCase()}</Tag>,
      width: 80
    },
    {
      title: 'Fiyat Modu',
      key: 'pricingMode',
      render: (_: any, r: ExternalFeed) => (
        <Tag color={r.pricingMode === 'fixed' ? 'blue' : 'gold'}>
          {r.pricingMode === 'fixed' ? 'Sabit Fiyat' : 'Altın Formülü'}
        </Tag>
      ),
      width: 120
    },
    {
      title: 'Son Sync',
      dataIndex: 'lastSyncAt',
      key: 'lastSyncAt',
      render: (date: string) => date ? new Date(date).toLocaleString('tr-TR') : '—',
      width: 140
    },
    {
      title: 'Sonuç',
      key: 'lastSyncResult',
      render: (_: any, r: ExternalFeed) => {
        if (!r.lastSyncResult) return <Tag>Henüz sync yok</Tag>;
        const res = r.lastSyncResult;
        return (
          <Space size={4}>
            <Tag color="green">+{res.added || 0}</Tag>
            <Tag color="blue">~{res.updated || 0}</Tag>
            {res.failed > 0 && <Tag color="red">!{res.failed}</Tag>}
          </Space>
        );
      },
      width: 120
    },
    {
      title: 'Otomatik',
      dataIndex: 'autoSync',
      key: 'autoSync',
      render: (val: boolean) => val ? <Tag color="green">Açık</Tag> : <Tag>Kapalı</Tag>,
      width: 90
    },
    {
      title: 'Durum',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (val: boolean) => <Tag color={val ? 'success' : 'error'}>{val ? 'Aktif' : 'Pasif'}</Tag>,
      width: 80
    },
    {
      title: 'İşlemler',
      key: 'actions',
      render: (_: any, record: ExternalFeed) => (
        <Space>
          <Button size="small" icon={<SyncOutlined />}
            loading={syncing === record.id}
            onClick={() => handleSync(record.id)}
            disabled={!record.isActive}>
            Sync
          </Button>
          <Button size="small" icon={<SettingOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm title="Feed pasife alınsın mı? (Ürünler silinmez)"
            onConfirm={() => handleDelete(record.id)}>
            <Button size="small" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
      width: 180
    }
  ];

  const stepForms = [
    // Step 0: Feed URL & Auth
    <div key="step0">
      <Form.Item name="name" label="Feed Adı" rules={[{ required: true, message: 'Feed adı gerekli' }]}>
        <Input placeholder="Örn: Pırlanta Kataloğu" />
      </Form.Item>
      <Form.Item name="feedUrl" label="Feed URL" rules={[{ required: true, type: 'url', message: 'Geçerli bir URL girin' }]}>
        <Input placeholder="https://www.pirlantakatalogu.com/..." />
      </Form.Item>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="fileFormat" label="Dosya Formatı" rules={[{ required: true }]}>
            <Select>
              {FILE_FORMATS.map(f => <Option key={f.value} value={f.value}>{f.label}</Option>)}
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="authType" label="Kimlik Doğrulama">
            <Select>
              {AUTH_TYPES.map(a => <Option key={a.value} value={a.value}>{a.label}</Option>)}
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Form.Item noStyle shouldUpdate={(prev, cur) => prev.authType !== cur.authType}>
        {({ getFieldValue }) => {
          const authType = getFieldValue('authType');
          if (authType === 'basic') {
            return (
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name={['authCredentials', 'username']} label="Kullanıcı Adı">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name={['authCredentials', 'password']} label="Şifre">
                    <Input.Password />
                  </Form.Item>
                </Col>
              </Row>
            );
          }
          if (authType === 'bearer') {
            return (
              <Form.Item name={['authCredentials', 'token']} label="Bearer Token">
                <Input.Password placeholder="Bearer token değeri" />
              </Form.Item>
            );
          }
          if (authType === 'api-key') {
            return (
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name={['authCredentials', 'headerName']} label="Header Adı">
                    <Input placeholder="X-API-Key" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name={['authCredentials', 'headerValue']} label="Header Değeri">
                    <Input.Password placeholder="API anahtarı" />
                  </Form.Item>
                </Col>
              </Row>
            );
          }
          return null;
        }}
      </Form.Item>

      <Button type="primary" icon={<ThunderboltOutlined />} onClick={handleTest} loading={testing}>
        Test Et
      </Button>
      {testResult && (
        <Alert
          style={{ marginTop: 16 }}
          type="success"
          showIcon
          message={`Test başarılı! ${testResult.total} ürün bulundu, ${testResult.headers.length} sütun tespit edildi.`}
        />
      )}
    </div>,

    // Step 1: Pricing Mode & Defaults
    <div key="step1">
      <Form.Item name="pricingMode" label="Fiyat Hesaplama Modu" rules={[{ required: true }]}>
        <Radio.Group>
          <Radio.Button value="fixed">Sabit Fiyat (XML'deki fiyatı kullan)</Radio.Button>
          <Radio.Button value="gold-formula">Altın Formülü (gram × milyem × kur)</Radio.Button>
        </Radio.Group>
      </Form.Item>

      <Form.Item noStyle shouldUpdate={(prev, cur) => prev.pricingMode !== cur.pricingMode}>
        {({ getFieldValue }) => {
          const mode = getFieldValue('pricingMode');
          if (mode === 'fixed') {
            return (
              <Card size="small" title="Sabit Fiyat Ayarları" style={{ marginBottom: 16 }}>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="currency" label="XML'deki Fiyat Para Birimi">
                      <Select>
                        <Option value="TRY">TL (Türk Lirası)</Option>
                        <Option value="USD">$ (Amerikan Doları)</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="priceMultiplier" label="Fiyat Çarpanı">
                      <InputNumber min={0.01} max={100} step={0.1} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>
            );
          }
          return (
            <Card size="small" title="Altın Formülü Varsayılan Değerleri" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item name="defaultGramWeight" label="Varsayılan Gram">
                    <InputNumber min={0.01} step={0.01} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="defaultMilyem" label="Varsayılan Milyem">
                    <Select>
                      <Option value={999}>24 Ayar (999)</Option>
                      <Option value={916}>22 Ayar (916)</Option>
                      <Option value={750}>18 Ayar (750)</Option>
                      <Option value={585}>14 Ayar (585)</Option>
                      <Option value={333}>8 Ayar (333)</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="defaultProfitMargin" label="Varsayılan Kâr Marjı (%)">
                    <InputNumber min={0} max={500} style={{ width: '100%' }} addonAfter="%" />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="priceMultiplier" label="Fiyat Çarpanı">
                <InputNumber min={0.01} max={100} step={0.1} style={{ width: 200 }} />
              </Form.Item>
            </Card>
          );
        }}
      </Form.Item>

      <Divider>Varsayılan Ürün Değerleri</Divider>
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item name="defaultCategory" label="Varsayılan Kategori">
            <Input placeholder="Örn: Pırlanta Takı" />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="defaultQuantity" label="Varsayılan Stok">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="defaultIsB2BEnabled" label="B2B'ye Açık" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Col>
      </Row>
    </div>,

    // Step 2: Field Mapping
    <div key="step2">
      <Alert
        message="Aşağıda feed'de tespit edilen sütunları sistem alanlarıyla eşleştirin. Eşleştirilmeyen alanlar varsayılan değer alır."
        type="info" showIcon style={{ marginBottom: 16 }}
      />
      {testResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { key: 'title', label: 'Ürün Adı (Zorunlu)' },
            { key: 'sku', label: 'Stok Kodu / SKU (Zorunlu)' },
            { key: 'description', label: 'Açıklama' },
            { key: 'category', label: 'Kategori' },
            { key: 'priceTRY', label: 'Fiyat (TL)' },
            { key: 'priceUSD', label: 'Fiyat ($)' },
            { key: 'quantity', label: 'Stok Adedi' },
            { key: 'gramWeight', label: 'Gram Ağırlığı' },
            { key: 'milyem', label: 'Milyem / Ayar' },
            { key: 'profitMargin', label: 'Kâr Marjı (%)' },
            { key: 'priceMultiplier', label: 'Fiyat Çarpanı' },
            { key: 'tags', label: 'Etiketler' },
            { key: 'marka', label: 'Marka' },
            { key: 'isActive', label: 'Aktif/Pasif' },
          ].map(field => (
            <div key={field.key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 200, fontWeight: 500 }}>{field.label}</div>
              <Form.Item name={['fieldMapping', field.key]} style={{ marginBottom: 0, flex: 1 }}>
                <Select allowClear placeholder="Seçin">
                  {testResult.headers.map(h => (
                    <Option key={h} value={h}>{h}</Option>
                  ))}
                </Select>
              </Form.Item>
            </div>
          ))}
        </div>
      )}
    </div>,

    // Step 3: Sync Settings & Save
    <div key="step3">
      <Descriptions column={1} bordered size="small" style={{ marginBottom: 24 }}>
        <Descriptions.Item label="Feed Adı">
          {form.getFieldValue('name') || '—'}
        </Descriptions.Item>
        <Descriptions.Item label="URL">{form.getFieldValue('feedUrl') || '—'}</Descriptions.Item>
        <Descriptions.Item label="Format">{form.getFieldValue('fileFormat')?.toUpperCase() || '—'}</Descriptions.Item>
        <Descriptions.Item label="Fiyat Modu">
          {form.getFieldValue('pricingMode') === 'fixed' ? 'Sabit Fiyat' : 'Altın Formülü'}
        </Descriptions.Item>
        {form.getFieldValue('pricingMode') === 'fixed' && (
          <Descriptions.Item label="Para Birimi">
            {form.getFieldValue('currency') === 'TRY' ? 'TL' : 'USD'}
          </Descriptions.Item>
        )}
        <Descriptions.Item label="Fiyat Çarpanı">{form.getFieldValue('priceMultiplier') || 1}</Descriptions.Item>
        {testResult && (
          <Descriptions.Item label="Tespit Edilen Ürün">{testResult.total} adet</Descriptions.Item>
        )}
      </Descriptions>

      <Card size="small" title="Senkronizasyon Ayarları" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="autoSync" label="Otomatik Senkronizasyon" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item noStyle shouldUpdate={(prev, cur) => prev.autoSync !== cur.autoSync}>
              {({ getFieldValue }) => {
                if (!getFieldValue('autoSync')) return null;
                return (
                  <Form.Item name="updateInterval" label="Senkronizasyon Aralığı" rules={[{ required: true }]}>
                    <Select>
                      {INTERVALS.filter(i => i.value !== 'manual').map(i => (
                        <Option key={i.value} value={i.value}>{i.label}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                );
              }}
            </Form.Item>
          </Col>
        </Row>
      </Card>
    </div>
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>Harici Feed'ler</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>Yeni Feed Ekle</Button>
      </div>

      <Card>
        <Table
          dataSource={feeds}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={editingFeed ? 'Feed Düzenle' : 'Yeni Feed Ekle'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={760}
        destroyOnClose
      >
        <Steps current={currentStep} style={{ marginBottom: 24 }} size="small">
          <Step title="URL & Auth" />
          <Step title="Fiyat & Varsayılanlar" />
          <Step title="Alan Eşleştirme" />
          <Step title="Sync Ayarları" />
        </Steps>

        <Form form={form} layout="vertical" style={{ maxWidth: 700 }}>
          {stepForms[currentStep]}
        </Form>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
          <Button disabled={currentStep === 0} onClick={() => setCurrentStep(s => s - 1)}>Geri</Button>
          <Space>
            {currentStep < 3 ? (
              <Button type="primary" onClick={handleNext}>İleri</Button>
            ) : (
              <Button type="primary" onClick={handleSave} icon={<CheckCircleOutlined />}>
                {editingFeed ? 'Güncelle' : 'Feed Oluştur'}
              </Button>
            )}
          </Space>
        </div>
      </Modal>
    </div>
  );
};

export default ExternalFeeds;
