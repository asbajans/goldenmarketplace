import { useEffect, useState } from 'react';
import {
  Card, Form, Input, Button, message, Divider, Spin, Switch, Select,
  Alert, Row, Col, Tag, Space
} from 'antd';
import {
  BankOutlined, CreditCardOutlined, SaveOutlined, InfoCircleOutlined
} from '@ant-design/icons';
import { AdminAPI } from '../services/api';

const { Option } = Select;

const PROVIDERS = [
  { value: 'none', label: 'Seçiniz / Devre Dışı', color: 'default' },
  { value: 'iyzico', label: 'iyzico', color: 'blue' },
  { value: 'paytr', label: 'PayTR', color: 'green' },
  { value: 'stripe', label: 'Stripe', color: 'purple' },
];

export default function PaymentSettingsPage() {
  const [bankForm] = Form.useForm();
  const [iyzicoForm] = Form.useForm();
  const [paytrForm] = Form.useForm();
  const [stripeForm] = Form.useForm();

  const [loading, setLoading] = useState(true);
  const [savingBank, setSavingBank] = useState(false);
  const [savingProvider, setSavingProvider] = useState(false);

  const [bankEnabled, setBankEnabled] = useState(true);
  const [ccEnabled, setCcEnabled] = useState(false);
  const [provider, setProvider] = useState('none');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data: Record<string, string> = await AdminAPI.getPaymentSettings();

      setBankEnabled(data.payment_bank_transfer_enabled !== 'false');
      setCcEnabled(data.payment_credit_card_enabled === 'true');
      setProvider(data.credit_card_provider || 'none');

      bankForm.setFieldsValue({
        bank_name: data.bank_name || '',
        bank_iban: data.bank_iban || '',
        bank_account_name: data.bank_account_name || '',
        bank_swift: data.bank_swift || '',
        bank_branch: data.bank_branch || '',
      });

      iyzicoForm.setFieldsValue({
        iyzico_api_key: data.iyzico_api_key || '',
        iyzico_secret_key: data.iyzico_secret_key || '',
        iyzico_base_url: data.iyzico_base_url || 'https://api.iyzipay.com',
      });

      paytrForm.setFieldsValue({
        paytr_merchant_id: data.paytr_merchant_id || '',
        paytr_merchant_key: data.paytr_merchant_key || '',
        paytr_merchant_salt: data.paytr_merchant_salt || '',
      });

      stripeForm.setFieldsValue({
        stripe_publishable_key: data.stripe_publishable_key || '',
        stripe_secret_key: data.stripe_secret_key || '',
      });
    } catch {
      message.error('Ödeme ayarları yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBank = async (values: any) => {
    try {
      setSavingBank(true);
      await AdminAPI.updatePaymentSettings({
        ...values,
        payment_bank_transfer_enabled: String(bankEnabled),
      });
      message.success('Banka havalesi ayarları kaydedildi!');
    } catch {
      message.error('Kayıt başarısız.');
    } finally {
      setSavingBank(false);
    }
  };

  const handleSaveProvider = async () => {
    try {
      setSavingProvider(true);
      let providerValues: Record<string, string> = {
        payment_credit_card_enabled: String(ccEnabled),
        credit_card_provider: provider,
      };

      // Collect the active provider's form values
      if (provider === 'iyzico') {
        const v = await iyzicoForm.validateFields();
        providerValues = { ...providerValues, ...v };
      } else if (provider === 'paytr') {
        const v = await paytrForm.validateFields();
        providerValues = { ...providerValues, ...v };
      } else if (provider === 'stripe') {
        const v = await stripeForm.validateFields();
        providerValues = { ...providerValues, ...v };
      }

      await AdminAPI.updatePaymentSettings(providerValues);
      message.success('Kredi kartı ayarları kaydedildi!');
    } catch (err: any) {
      if (err?.errorFields) {
        message.error('Lütfen tüm zorunlu alanları doldurun.');
      } else {
        message.error('Kayıt başarısız.');
      }
    } finally {
      setSavingProvider(false);
    }
  };

  if (loading) {
    return <Spin size="large" style={{ display: 'flex', justifyContent: 'center', marginTop: 100 }} />;
  }

  const activeProviderLabel = PROVIDERS.find(p => p.value === provider);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>Ödeme Yönetimi</h2>
        <p style={{ color: '#8c8c8c', marginTop: 4 }}>
          Market sitenizde hangi ödeme yöntemlerinin aktif olacağını ve entegrasyon bilgilerini buradan yönetin.
        </p>
      </div>

      {/* ── BANK TRANSFER ── */}
      <Card
        title={
          <Space>
            <BankOutlined style={{ color: '#1890ff' }} />
            <span>Banka Havalesi / EFT</span>
            <Switch
              checked={bankEnabled}
              onChange={setBankEnabled}
              checkedChildren="Aktif"
              unCheckedChildren="Pasif"
            />
          </Space>
        }
        bordered={false}
        style={{ marginBottom: 24 }}
      >
        {!bankEnabled && (
          <Alert
            type="warning"
            showIcon
            message="Banka havalesi devre dışı — müşteriler bu ödeme yöntemini görmeyecek."
            style={{ marginBottom: 16 }}
          />
        )}

        <Form form={bankForm} layout="vertical" onFinish={handleSaveBank}>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="bank_name" label="Banka Adı">
                <Input placeholder="örn: Garanti BBVA" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="bank_branch" label="Şube Adı">
                <Input placeholder="örn: Levent Şubesi" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="bank_account_name" label="Hesap Sahibi Adı">
            <Input placeholder="örn: Golden Crafters Kuyumculuk Ltd." />
          </Form.Item>

          <Form.Item
            name="bank_iban"
            label="IBAN"
            rules={[{ pattern: /^TR\d{24}$/, message: 'Geçerli bir TR IBAN girin (TR + 24 rakam)' }]}
          >
            <Input placeholder="TR00 0000 0000 0000 0000 0000 00" style={{ fontFamily: 'monospace' }} />
          </Form.Item>

          <Form.Item name="bank_swift" label="SWIFT / BIC Kodu">
            <Input placeholder="örn: TGBATRISXXX" style={{ fontFamily: 'monospace' }} />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={savingBank}>
              Banka Bilgilerini Kaydet
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* ── CREDIT CARD ── */}
      <Card
        title={
          <Space>
            <CreditCardOutlined style={{ color: '#722ed1' }} />
            <span>Kredi / Banka Kartı</span>
            <Switch
              checked={ccEnabled}
              onChange={val => { setCcEnabled(val); if (!val) setProvider('none'); }}
              checkedChildren="Aktif"
              unCheckedChildren="Pasif"
            />
            {provider !== 'none' && (
              <Tag color={activeProviderLabel?.color}>{activeProviderLabel?.label}</Tag>
            )}
          </Space>
        }
        bordered={false}
      >
        {!ccEnabled && (
          <Alert
            type="info"
            showIcon
            icon={<InfoCircleOutlined />}
            message="Kredi kartı ödemesi devre dışı. Aktifleştirmek için toggle'ı açın ve bir sağlayıcı seçin."
            style={{ marginBottom: 16 }}
          />
        )}

        {ccEnabled && (
          <>
            <Form.Item label="Ödeme Sağlayıcısı" style={{ maxWidth: 320, marginBottom: 24 }}>
              <Select value={provider} onChange={setProvider} size="large">
                {PROVIDERS.map(p => (
                  <Option key={p.value} value={p.value}>
                    <Tag color={p.color} style={{ marginRight: 8 }}>{p.label}</Tag>
                    {p.value === 'iyzico' && '— Türkiye\'nin önde gelen ödeme altyapısı'}
                    {p.value === 'paytr' && '— Türkiye odaklı, kolay entegrasyon'}
                    {p.value === 'stripe' && '— Global kart ödeme altyapısı'}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            {/* iyzico */}
            {provider === 'iyzico' && (
              <>
                <Divider orientation="left">iyzico Ayarları</Divider>
                <Alert
                  type="info"
                  showIcon
                  message={<span>iyzico API anahtarlarınızı <a href="https://merchant.iyzico.com" target="_blank" rel="noreferrer">merchant.iyzico.com</a> adresinden alabilirsiniz.</span>}
                  style={{ marginBottom: 16 }}
                />
                <Form form={iyzicoForm} layout="vertical">
                  <Row gutter={16}>
                    <Col xs={24} md={12}>
                      <Form.Item name="iyzico_api_key" label="API Key" rules={[{ required: true, message: 'Zorunlu' }]}>
                        <Input.Password placeholder="iyzico API Key" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item name="iyzico_secret_key" label="Secret Key" rules={[{ required: true, message: 'Zorunlu' }]}>
                        <Input.Password placeholder="iyzico Secret Key" />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Form.Item name="iyzico_base_url" label="API URL">
                    <Select>
                      <Option value="https://api.iyzipay.com">Canlı — https://api.iyzipay.com</Option>
                      <Option value="https://sandbox-api.iyzipay.com">Sandbox (Test) — https://sandbox-api.iyzipay.com</Option>
                    </Select>
                  </Form.Item>
                </Form>
              </>
            )}

            {/* PayTR */}
            {provider === 'paytr' && (
              <>
                <Divider orientation="left">PayTR Ayarları</Divider>
                <Alert
                  type="info"
                  showIcon
                  message={<span>PayTR bilgilerinizi <a href="https://www.paytr.com" target="_blank" rel="noreferrer">paytr.com</a> merchant panelinizden alabilirsiniz.</span>}
                  style={{ marginBottom: 16 }}
                />
                <Form form={paytrForm} layout="vertical">
                  <Row gutter={16}>
                    <Col xs={24} md={8}>
                      <Form.Item name="paytr_merchant_id" label="Merchant ID" rules={[{ required: true, message: 'Zorunlu' }]}>
                        <Input placeholder="PayTR Merchant ID" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item name="paytr_merchant_key" label="Merchant Key" rules={[{ required: true, message: 'Zorunlu' }]}>
                        <Input.Password placeholder="PayTR Merchant Key" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item name="paytr_merchant_salt" label="Merchant Salt" rules={[{ required: true, message: 'Zorunlu' }]}>
                        <Input.Password placeholder="PayTR Merchant Salt" />
                      </Form.Item>
                    </Col>
                  </Row>
                </Form>
              </>
            )}

            {/* Stripe */}
            {provider === 'stripe' && (
              <>
                <Divider orientation="left">Stripe Ayarları</Divider>
                <Alert
                  type="info"
                  showIcon
                  message={<span>Stripe anahtarlarınızı <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noreferrer">dashboard.stripe.com</a> adresinden alabilirsiniz.</span>}
                  style={{ marginBottom: 16 }}
                />
                <Form form={stripeForm} layout="vertical">
                  <Row gutter={16}>
                    <Col xs={24} md={12}>
                      <Form.Item name="stripe_publishable_key" label="Publishable Key (pk_...)" rules={[{ required: true, message: 'Zorunlu' }]}>
                        <Input placeholder="pk_live_..." />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item name="stripe_secret_key" label="Secret Key (sk_...)" rules={[{ required: true, message: 'Zorunlu' }]}>
                        <Input.Password placeholder="sk_live_..." />
                      </Form.Item>
                    </Col>
                  </Row>
                </Form>
              </>
            )}
          </>
        )}

        <div style={{ marginTop: 24 }}>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={savingProvider}
            onClick={handleSaveProvider}
            style={{ backgroundColor: '#722ed1', borderColor: '#722ed1' }}
          >
            Kredi Kartı Ayarlarını Kaydet
          </Button>
        </div>
      </Card>
    </div>
  );
}
