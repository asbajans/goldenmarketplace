
import React from 'react';
import { Result, Button } from 'antd';
import { Link } from 'react-router-dom';

const SubscriptionSuccess: React.FC = () => {
    return (
        <Result
            status="success"
            title="Aboneliğiniz Başarıyla Aktifleştirildi!"
            subTitle="Teşekkür ederiz. Artık platformun tüm özelliklerine erişebilirsiniz."
            extra={[
                <Link to="/seller/dashboard">
                    <Button type="primary" key="dashboard">
                        Panele Dön
                    </Button>
                </Link>
            ]}
        />
    );
};

export default SubscriptionSuccess;
