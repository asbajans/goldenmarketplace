import React, { useEffect, useState } from 'react';
import { Result, Button, Spin } from 'antd';
import { Link, useSearchParams } from 'react-router-dom';
import { verifyCheckoutSession } from '../api/subscription';

const SubscriptionSuccess: React.FC = () => {
    const [params] = useSearchParams();
    const sessionId = params.get('session_id');
    const kind = params.get('kind') || 'subscription';
    const [state, setState] = useState<'loading' | 'paid' | 'pending' | 'error'>('loading');
    const [detail, setDetail] = useState('');

    useEffect(() => {
        // Stripe'tan dönüş yoksa (örn. havale akışı) doğrudan bilgi göster
        if (!sessionId) {
            setState('pending');
            return;
        }
        verifyCheckoutSession(sessionId)
            .then(() => setState('paid'))
            .catch((err: any) => {
                if (err?.response?.status === 402) {
                    setState('pending');
                    setDetail('Ödemeniz henüz doğrulanmadı. Onaylanınca paketiniz otomatik aktifleşecek.');
                } else {
                    setState('error');
                    setDetail(err?.response?.data?.error || 'Doğrulama başarısız.');
                }
            });
    }, [sessionId]);

    if (state === 'loading') {
        return (
            <div style={{ textAlign: 'center', padding: 80 }}>
                <Spin size="large" />
                <div style={{ marginTop: 16 }}>Ödemeniz doğrulanıyor, lütfen bekleyin...</div>
            </div>
        );
    }

    if (state === 'paid') {
        return (
            <Result
                status="success"
                title={kind === 'credit' ? 'Kredileriniz Yüklendi!' : 'Aboneliğiniz Aktifleştirildi!'}
                subTitle={kind === 'credit' ? 'Ödemeniz doğrulandı ve AI kredileriniz bakiyenize eklendi.' : 'Ödemeniz doğrulandı. Paketinize ait tüm modüller açıldı.'}
                extra={[
                    <Link to={kind === 'credit' ? '/credits' : '/dashboard'} key="back">
                        <Button type="primary">{kind === 'credit' ? 'Kredilerime Dön' : 'Panele Dön'}</Button>
                    </Link>
                ]}
            />
        );
    }

    if (state === 'pending') {
        return (
            <Result
                status="warning"
                title="Ödeme Onay Bekliyor"
                subTitle={detail || 'Talebiniz alındı. Havale/EFT sonrası admin onayıyla işleminiz tamamlanacak. Durumu Abonelik sayfasından takip edebilirsiniz.'}
                extra={[
                    <Link to="/subscription" key="sub">
                        <Button type="primary">Abonelik Sayfasına Dön</Button>
                    </Link>
                ]}
            />
        );
    }

    return (
        <Result
            status="error"
            title="Doğrulama Başarısız"
            subTitle={detail}
            extra={[
                <Link to="/subscription" key="sub">
                    <Button type="primary">Tekrar Dene</Button>
                </Link>
            ]}
        />
    );
};

export default SubscriptionSuccess;
