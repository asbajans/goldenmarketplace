
import React, { useState, useEffect } from 'react';
import { Card, Button, Row, Col, Typography, Tag, message, Spin } from 'antd';
import { getSubscriptionPlans, createCheckoutSession, mockActivateSubscription } from '../api/subscription';
import { CheckOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

const Subscription: React.FC = () => {
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        try {
            const data = await getSubscriptionPlans();
            setPlans(data);
        } catch (error) {
            console.error('Failed to fetch plans', error);
            message.error('Planlar yüklenemedi.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubscribe = async (plan: any) => {
        setSubmitting(true);
        try {
            // Use stripePriceId if available, otherwise fallback to plan name or ID for mock
            const priceIdToUse = plan.stripePriceId || plan.id;
            const response = await createCheckoutSession(priceIdToUse, plan.name);

            if (response.url) {
                // Determine if it's a mock session (contains 'session_id=cs_mock')
                if (response.url.includes('cs_mock')) {
                    // It's a mock! We can simulate success by calling mockActivate
                    await mockActivateSubscription(plan.name);
                    message.success('Demo Modu: Abonelik Başarıyla Aktifleştirildi!');
                    // Redirect to Success Page or Refresh
                    window.location.href = '/seller/subscription/success';
                } else {
                    // Real Stripe
                    window.location.href = response.url;
                }
            }
        } catch (error: any) {
            console.error('Subscription error:', error);
            const backendError = error.response?.data?.error;
            message.error(typeof backendError === 'string' ? backendError : 'Abonelik başlatılamadı. Lütfen tekrar deneyin.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '24px' }}>
            <Title level={2} style={{ textAlign: 'center', marginBottom: '40px' }}>Satıcı Abonelik Planları</Title>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '50px' }}><Spin size="large" /></div>
            ) : (
                <Row gutter={[24, 24]} justify="center">
                    {plans.map((plan) => {
                        const isPopular = plan.name.toLowerCase().includes('gümüş') || plan.name.toLowerCase().includes('silver');
                        const planColor = plan.name.toLowerCase().includes('altın') ? '#ffd700' :
                            plan.name.toLowerCase().includes('gümüş') ? '#c0c0c0' : '#cd7f32';

                        return (
                            <Col xs={24} sm={12} lg={8} key={plan.id}>
                                <Card
                                    hoverable
                                    style={{
                                        height: '100%',
                                        border: isPopular ? '2px solid #1890ff' : '1px solid #f0f0f0',
                                        transform: isPopular ? 'scale(1.05)' : 'none'
                                    }}
                                    bodyStyle={{ display: 'flex', flexDirection: 'column', height: '100%' }}
                                >
                                    {isPopular && (
                                        <Tag color="blue" style={{ position: 'absolute', top: 10, right: 10 }}>En Popüler</Tag>
                                    )}
                                    <div style={{ textAlign: 'center', marginBottom: 20 }}>
                                        <Title level={3} style={{ color: planColor }}>{plan.name}</Title>
                                        <Title level={1} style={{ margin: '10px 0' }}>
                                            {plan.price}₺ <span style={{ fontSize: '16px', color: '#999' }}>/{plan.interval === 'year' ? 'yıl' : 'ay'}</span>
                                        </Title>
                                    </div>

                                    <div style={{ flex: 1 }}>
                                        {(plan.features || []).map((feature: string, index: number) => (
                                            <Paragraph key={index}>
                                                <CheckOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                                                {feature}
                                            </Paragraph>
                                        ))}
                                    </div>

                                    <Button
                                        type="primary"
                                        size="large"
                                        block
                                        style={{ marginTop: 20, background: isPopular ? '#1890ff' : undefined }}
                                        onClick={() => handleSubscribe(plan)}
                                        loading={submitting}
                                    >
                                        Seç & Başla
                                    </Button>
                                </Card>
                            </Col>
                        );
                    })}
                </Row>
            )}
        </div>
    );
};

export default Subscription;
