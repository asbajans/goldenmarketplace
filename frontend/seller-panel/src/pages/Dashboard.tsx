
import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Button, message, Tooltip, Typography } from 'antd';
import { CopyOutlined, LinkOutlined, ShopOutlined } from '@ant-design/icons';
import client from '../api/client';

const { Text } = Typography;

const Dashboard: React.FC = () => {
    const [stats, setStats] = useState({ products: 0, orders: 0, revenue: 0, rating: 0 });
    const [storeSlug, setStoreSlug] = useState<string | null>(null);

    let userName = '';
    let storeName = '';
    let planName = 'Yok (Varsayılan 5 Limit)';
    let remainingDays: number | null = null;
    try {
        const u = JSON.parse(localStorage.getItem('user') || 'null');
        if (u) {
            userName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.name;
            storeName = u.store?.storeName || u.store?.name || '';
            if (u.subscriptionPlan) planName = u.subscriptionPlan;
            if (u.subscriptionEndDate) {
                const diff = new Date(u.subscriptionEndDate).getTime() - Date.now();
                remainingDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
            }
        }
    } catch (e) {}

    useEffect(() => {
        try {
            const u = JSON.parse(localStorage.getItem('user') || 'null');
            if (u?.store?.storeSlug) {
                setStoreSlug(u.store.storeSlug);
            }
            // Fetch product count regardless
            client.get('/products?limit=1').then(res => {
                if (res.data?.pagination?.total !== undefined) {
                    setStats(s => ({ ...s, products: res.data.pagination.total }));
                }
            }).catch(() => {});
        } catch {}
    }, []);

    const storeUrl = storeSlug
        ? `${window.location.origin}/store/${storeSlug}`
        : null;

    const copyStoreLink = () => {
        if (!storeUrl) return;
        navigator.clipboard.writeText(storeUrl).then(() => {
            message.success('Mağaza linki kopyalandı!');
        }).catch(() => {
            message.error('Kopyalama başarısız');
        });
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                    <h1 style={{ marginBottom: 4, marginTop: 0 }}>Hoş Geldiniz, {userName || 'Satıcı'}</h1>
                    {storeName && <h3 style={{ marginTop: 0, color: '#666', fontWeight: 'normal' }}>Mağaza: {storeName}</h3>}
                </div>
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
                    <div>
                        <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>Aktif Paketiniz</div>
                        <div style={{ 
                            background: '#fffbe6', border: '1px solid #ffe58f', padding: '6px 12px', 
                            borderRadius: 6, color: '#d48806', fontWeight: 'bold' 
                        }}>
                            {planName} {remainingDays !== null && `(Kalan Süre: ${remainingDays > 0 ? remainingDays : 0} Gün)`}
                        </div>
                    </div>

                    {/* Store Share Link */}
                    {storeUrl && (
                        <div style={{
                            background: '#f0f9ff', border: '1px solid #91d5ff',
                            borderRadius: 8, padding: '8px 12px',
                            display: 'flex', alignItems: 'center', gap: 8, maxWidth: 380
                        }}>
                            <ShopOutlined style={{ color: '#1890ff' }} />
                            <Text style={{ fontSize: 12, color: '#1890ff', flex: 1, wordBreak: 'break-all' }}>
                                {storeUrl}
                            </Text>
                            <Tooltip title="Linki Kopyala">
                                <Button
                                    size="small"
                                    icon={<CopyOutlined />}
                                    onClick={copyStoreLink}
                                    style={{ flexShrink: 0 }}
                                />
                            </Tooltip>
                            <Tooltip title="Mağazayı Aç">
                                <Button
                                    size="small"
                                    icon={<LinkOutlined />}
                                    onClick={() => window.open(storeUrl, '_blank')}
                                    style={{ flexShrink: 0 }}
                                />
                            </Tooltip>
                        </div>
                    )}
                </div>
            </div>
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
