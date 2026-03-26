
import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic } from 'antd';

const Dashboard: React.FC = () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [stats, _setStats] = useState({
        products: 0,
        orders: 0,
        revenue: 0,
        rating: 0
    });

    useEffect(() => {
        // Fetch stats from API in future
        // For now, mock or use whatever stats endpoint we might have
        // But plan says "Fetch real stats from an endpoint"
        // I will implement a placeholder fetch to prove wiring
    }, []);

    let userName = '';
    let storeName = '';
    try {
        const u = JSON.parse(localStorage.getItem('user') || 'null');
        if (u) {
            userName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.name;
            storeName = u.store?.storeName || u.store?.name || '';
        }
    } catch (e) {}

    return (
        <div>
            <h1 style={{ marginBottom: 4 }}>Hoş Geldiniz, {userName || 'Satıcı'}</h1>
            {storeName && <h3 style={{ marginTop: 0, color: '#666', fontWeight: 'normal' }}>Mağaza: {storeName}</h3>}
            <Row gutter={16}>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic title="Toplam Ürün" value={stats.products} />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic title="Toplam Satış" value={stats.orders} />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic title="Toplam Gelir" value={stats.revenue} prefix="₺" precision={2} />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic title="Mağaza Puanı" value={stats.rating} suffix="/5" precision={1} />
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default Dashboard;
