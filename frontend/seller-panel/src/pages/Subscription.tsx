
import React, { useState } from 'react';
import { Card, Button, Row, Col, Typography, Tag, message } from 'antd';
import { createCheckoutSession, mockActivateSubscription } from '../api/subscription';
import { CheckOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

const plans = [
    {
        name: 'Bronz',
        price: '99',
        priceId: 'price_bronze', // Mock ID
        features: ['50 Ürün Listeleme', 'Temel İstatistikler', 'Standart Destek'],
        color: '#cd7f32'
    },
    {
        name: 'Gümüş',
        price: '199',
        priceId: 'price_silver', // Mock ID
        features: ['200 Ürün Listeleme', 'Gelişmiş İstatistikler', 'Öncelikli Destek', 'Reklam Kredisi'],
        color: '#c0c0c0',
        popular: true
    },
    {
        name: 'Altın',
        price: '399',
        priceId: 'price_gold', // Mock ID
        features: ['Sınırsız Ürün', 'VIP Destek', 'Altın Endeksli Reklam', 'Tüm Hazır Entegrasyonlar'],
        color: '#ffd700'
    }
];

const Subscription: React.FC = () => {
    const [loading, setLoading] = useState(false);

    const handleSubscribe = async (plan: any) => {
        setLoading(true);
        try {
            // For Demo: Use Mock Activation if "Altın" plan is selected to show immediate effect?
            // Or just use the Checkout flow.
            // Let's use the Checkout flow which returns a URL.

            const response = await createCheckoutSession(plan.priceId, plan.name);

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
        } catch (error) {
            console.error(error);
            message.error('Abonelik başlatılamadı.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '24px' }}>
            <Title level={2} style={{ textAlign: 'center', marginBottom: '40px' }}>Satıcı Abonelik Planları</Title>
            <Row gutter={[24, 24]} justify="center">
                {plans.map((plan) => (
                    <Col xs={24} sm={12} lg={8} key={plan.name}>
                        <Card
                            hoverable
                            style={{
                                height: '100%',
                                border: plan.popular ? '2px solid #1890ff' : '1px solid #f0f0f0',
                                transform: plan.popular ? 'scale(1.05)' : 'none'
                            }}
                            bodyStyle={{ display: 'flex', flexDirection: 'column', height: '100%' }}
                        >
                            {plan.popular && (
                                <Tag color="blue" style={{ position: 'absolute', top: 10, right: 10 }}>En Popüler</Tag>
                            )}
                            <div style={{ textAlign: 'center', marginBottom: 20 }}>
                                <Title level={3} style={{ color: plan.color }}>{plan.name}</Title>
                                <Title level={1} style={{ margin: '10px 0' }}>
                                    {plan.price}₺ <span style={{ fontSize: '16px', color: '#999' }}>/ay</span>
                                </Title>
                            </div>

                            <div style={{ flex: 1 }}>
                                {plan.features.map((feature, index) => (
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
                                style={{ marginTop: 20, background: plan.popular ? '#1890ff' : undefined }}
                                onClick={() => handleSubscribe(plan)}
                                loading={loading}
                            >
                                Seç & Başla
                            </Button>
                        </Card>
                    </Col>
                ))}
            </Row>
        </div>
    );
};

export default Subscription;
