import React, { useState, useEffect } from 'react';
import { Card, Button, Row, Col, Typography, Tag, message, Spin, Radio, Modal, Alert, Table, Divider } from 'antd';
import { useSearchParams } from 'react-router-dom';
import { getSubscriptionPlans, getMySubscription, getMyPayments, checkoutSubscription } from '../api/subscription';
import { CheckOutlined, CloseOutlined, BankOutlined, CreditCardOutlined } from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

interface Plan {
    id: string;
    name: string;
    description?: string;
    monthlyPrice: number;
    yearlyPrice: number;
    currency: string;
    productLimit: number;
    integrationLimit: number;
    aiTranslationEnabled?: boolean;
    aiContentEnabled?: boolean;
    aiMonthlyCredit?: number;
    b2bEnabled?: boolean;
    bulkUploadEnabled?: boolean;
    maxExternalFeeds?: number;
    features?: string[];
}

const ModuleRow: React.FC<{ ok?: boolean; label: string; detail?: string }> = ({ ok, label, detail }) => (
    <Paragraph style={{ marginBottom: 4 }}>
        {ok ? <CheckOutlined style={{ color: '#52c41a', marginRight: 8 }} /> : <CloseOutlined style={{ color: '#d9d9d9', marginRight: 8 }} />}
        <Text type={ok ? undefined : 'secondary'}>{label}</Text>
        {detail && <Text type="secondary"> — {detail}</Text>}
    </Paragraph>
);

const Subscription: React.FC = () => {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState<string | null>(null);
    const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly');
    const [me, setMe] = useState<any>(null);
    const [payments, setPayments] = useState<any[]>([]);
    const [checkoutPlan, setCheckoutPlan] = useState<Plan | null>(null);
    const [provider, setProvider] = useState<'stripe' | 'bank'>('bank');
    const [params] = useSearchParams();

    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [plansData, meData, paymentsData] = await Promise.all([
                getSubscriptionPlans(),
                getMySubscription().catch(() => null),
                getMyPayments().catch(() => [])
            ]);
            setPlans(Array.isArray(plansData) ? plansData : ((plansData as any)?.data || []));
            setMe(meData);
            setPayments(Array.isArray(paymentsData) ? paymentsData : []);
        } catch (error) {
            message.error('Planlar yüklenemedi.');
        } finally {
            setLoading(false);
        }
    };

    const openCheckout = (plan: Plan) => {
        const methods = me?.paymentMethods;
        if (!methods?.bankEnabled && !(methods?.cardEnabled && methods?.provider === 'stripe')) {
            message.error('Şu an aktif ödeme yöntemi yok. Lütfen yöneticiyle iletişime geçin.');
            return;
        }
        setCheckoutPlan(plan);
        setProvider(methods?.cardEnabled && methods?.provider === 'stripe' ? 'stripe' : 'bank');
    };

    const handleCheckout = async () => {
        if (!checkoutPlan) return;
        setSubmitting(checkoutPlan.id);
        try {
            const res = await checkoutSubscription(checkoutPlan.id, period, provider);
            if (res.url) {
                window.location.href = res.url;
            } else {
                Modal.success({
                    title: 'Talebiniz Alındı',
                    content: (
                        <div>
                            <p>{res.message}</p>
                            {res.bank && (res.bank.iban || res.bank.name) && (
                                <div style={{ background: '#f5f5f5', padding: 12, borderRadius: 8, marginTop: 8 }}>
                                    <div><b>Banka:</b> {res.bank.name} {res.bank.branch}</div>
                                    <div><b>Alıcı:</b> {res.bank.accountName}</div>
                                    <div><b>IBAN:</b> <Text code copyable>{res.bank.iban}</Text></div>
                                    <div style={{ marginTop: 8 }}><Text type="secondary">Açıklamaya e-posta adresinizi yazmayı unutmayın.</Text></div>
                                </div>
                            )}
                        </div>
                    ),
                    onOk: () => fetchAll()
                });
                setCheckoutPlan(null);
            }
        } catch (error: any) {
            message.error(error.response?.data?.error || 'Abonelik başlatılamadı.');
        } finally {
            setSubmitting(null);
        }
    };

    const priceOf = (plan: Plan) => (period === 'yearly' ? Number(plan.yearlyPrice) : Number(plan.monthlyPrice));

    const paymentColumns = [
        { title: 'Tarih', dataIndex: 'createdAt', render: (d: string) => new Date(d).toLocaleString('tr-TR') },
        {
            title: 'Tür', dataIndex: 'kind',
            render: (k: string, r: any) => k === 'subscription' ? `Paket (${r.billingPeriod === 'yearly' ? 'Yıllık' : 'Aylık'})` : `Kredi (${r.credits})`
        },
        { title: 'Tutar', dataIndex: 'amount', render: (a: number, r: any) => `$${a} ${r.currency || 'USD'}` },
        { title: 'Yöntem', dataIndex: 'provider', render: (p: string) => p === 'stripe' ? 'Kart (Stripe)' : p === 'bank' ? 'Havale/EFT' : 'Manuel' },
        {
            title: 'Durum', dataIndex: 'status',
            render: (s: string) => (
                <Tag color={s === 'paid' ? 'success' : s === 'pending' ? 'warning' : 'error'}>
                    {s === 'paid' ? 'Ödendi' : s === 'pending' ? 'Onay Bekliyor' : s === 'rejected' ? 'Reddedildi' : s}
                </Tag>
            )
        }
    ];

    return (
        <div style={{ padding: '24px' }}>
            <Title level={2} style={{ textAlign: 'center', marginBottom: 8 }}>Satıcı Abonelik Planları</Title>
            <Paragraph type="secondary" style={{ textAlign: 'center', marginBottom: 24 }}>
                Paketler modüllerle çalışır: ürün ve entegrasyon limitleri, B2B erişimi, AI kredisi, toplu yükleme ve harici feed hakkı paketinize göre açılır.
            </Paragraph>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '50px' }}><Spin size="large" /></div>
            ) : (
                <>
                    {params.get('cancelled') === '1' && (
                        <Alert
                            type="warning"
                            showIcon
                            closable
                            style={{ marginBottom: 16, maxWidth: 900, margin: '0 auto 16px' }}
                            message="Kart ödemesi yarıda bırakıldı. Dilerseniz havale/EFT ile devam edebilirsiniz."
                        />
                    )}
                    {me?.subscriptionPlan && (
                        <Alert
                            type="info"
                            showIcon
                            style={{ marginBottom: 16, maxWidth: 900, margin: '0 auto 16px' }}
                            message={`Mevcut paketiniz: ${me.subscriptionPlan} (${me.subscriptionStatus})${me.subscriptionEndDate ? ` — bitiş: ${new Date(me.subscriptionEndDate).toLocaleDateString('tr-TR')}` : ''}`}
                        />
                    )}
                    {me?.pendingPayments?.length > 0 && (
                        <Alert
                            type="warning"
                            showIcon
                            style={{ marginBottom: 16, maxWidth: 900, margin: '0 auto 16px' }}
                            message="Onay bekleyen ödemeniz var. Havale/EFT sonrası admin onayıyla paketiniz aktifleşecek."
                        />
                    )}

                    <div style={{ textAlign: 'center', marginBottom: 24 }}>
                        <Radio.Group value={period} onChange={e => setPeriod(e.target.value)} size="large" buttonStyle="solid">
                            <Radio.Button value="monthly">Aylık</Radio.Button>
                            <Radio.Button value="yearly">Yıllık (Avantajlı)</Radio.Button>
                        </Radio.Group>
                    </div>

                    <Row gutter={[24, 24]} justify="center">
                        {plans.map((plan) => {
                            const isCurrent = me?.subscriptionPlan === plan.name && me?.subscriptionStatus === 'active';
                            return (
                                <Col xs={24} sm={12} lg={8} key={plan.id}>
                                    <Card
                                        hoverable
                                        style={{ height: '100%', border: isCurrent ? '2px solid #52c41a' : '1px solid #f0f0f0' }}
                                    >
                                        {isCurrent && <Tag color="success" style={{ position: 'absolute', top: 10, right: 10 }}>Mevcut Paket</Tag>}
                                        <div style={{ textAlign: 'center', marginBottom: 12 }}>
                                            <Title level={3}>{plan.name}</Title>
                                            <Title level={2} style={{ margin: '10px 0' }}>
                                                ${priceOf(plan)} {plan.currency || 'USD'} <span style={{ fontSize: '16px', color: '#999' }}>/ {period === 'yearly' ? 'yıl' : 'ay'}</span>
                                            </Title>
                                            {plan.description && <Paragraph type="secondary">{plan.description}</Paragraph>}
                                        </div>

                                        <Divider orientation="left" plain>Modüller & Limitler</Divider>
                                        <ModuleRow ok label="Ürün" detail={`en fazla ${plan.productLimit}`} />
                                        <ModuleRow ok label="Pazaryeri entegrasyonu" detail={`en fazla ${plan.integrationLimit}`} />
                                        <ModuleRow ok={!!plan.b2bEnabled} label="B2B erişimi" />
                                        <ModuleRow ok={!!plan.bulkUploadEnabled} label="Toplu ürün yükleme" />
                                        <ModuleRow ok={(plan.maxExternalFeeds || 0) > 0} label="Harici feed" detail={(plan.maxExternalFeeds || 0) > 0 ? `en fazla ${plan.maxExternalFeeds}` : undefined} />
                                        <ModuleRow ok={!!(plan.aiTranslationEnabled || plan.aiContentEnabled)} label="AI özellikleri" detail={plan.aiMonthlyCredit ? `aylık ${plan.aiMonthlyCredit} kredi hediyeli` : undefined} />

                                        {(plan.features || []).length > 0 && (
                                            <>
                                                <Divider orientation="left" plain>Öne Çıkanlar</Divider>
                                                {(plan.features || []).map((feature: string, index: number) => (
                                                    <Paragraph key={index} style={{ marginBottom: 4 }}>
                                                        <CheckOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                                                        {feature}
                                                    </Paragraph>
                                                ))}
                                            </>
                                        )}

                                        <Button
                                            type={isCurrent ? 'default' : 'primary'}
                                            size="large"
                                            block
                                            style={{ marginTop: 20 }}
                                            onClick={() => openCheckout(plan)}
                                            loading={submitting === plan.id}
                                            disabled={isCurrent}
                                        >
                                            {isCurrent ? 'Kullandığınız Paket' : 'Seç & Ödemeye Geç'}
                                        </Button>
                                    </Card>
                                </Col>
                            );
                        })}
                    </Row>

                    {payments.length > 0 && (
                        <Card title="Ödeme Geçmişim" style={{ maxWidth: 1000, margin: '32px auto 0' }}>
                            <Table dataSource={payments} columns={paymentColumns as any} rowKey="id" pagination={{ pageSize: 8 }} />
                        </Card>
                    )}
                </>
            )}

            <Modal
                title={`${checkoutPlan?.name} — ${period === 'yearly' ? 'Yıllık' : 'Aylık'} Ödeme`}
                open={!!checkoutPlan}
                onCancel={() => setCheckoutPlan(null)}
                onOk={handleCheckout}
                confirmLoading={!!submitting}
                okText="Ödemeye Geç"
                cancelText="Vazgeç"
            >
                {checkoutPlan && (
                    <>
                        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
                            ${priceOf(checkoutPlan)} {checkoutPlan.currency || 'USD'}
                        </div>
                        <Radio.Group value={provider} onChange={e => setProvider(e.target.value)} style={{ width: '100%' }}>
                            {me?.paymentMethods?.cardEnabled && me?.paymentMethods?.provider === 'stripe' && (
                                <Radio.Button value="stripe" style={{ width: '50%', textAlign: 'center' }}>
                                    <CreditCardOutlined /> Kart (Stripe)
                                </Radio.Button>
                            )}
                            {me?.paymentMethods?.bankEnabled && (
                                <Radio.Button value="bank" style={{ width: '50%', textAlign: 'center' }}>
                                    <BankOutlined /> Havale / EFT
                                </Radio.Button>
                            )}
                        </Radio.Group>
                        {provider === 'bank' && (
                            <Alert
                                type="info"
                                showIcon
                                style={{ marginTop: 16 }}
                                message="Havale/EFT sonrası talebiniz admin onayına düşer. Onaylanınca paketiniz aktifleşir, SMS/e-posta gerekmez — buradan takip edebilirsiniz."
                            />
                        )}
                        {provider === 'stripe' && (
                            <Alert
                                type="info"
                                showIcon
                                style={{ marginTop: 16 }}
                                message="Stripe güvenli ödeme sayfasına yönlendirileceksiniz. Ödeme doğrulanınca paketiniz otomatik aktifleşir."
                            />
                        )}
                    </>
                )}
            </Modal>
        </div>
    );
};

export default Subscription;
