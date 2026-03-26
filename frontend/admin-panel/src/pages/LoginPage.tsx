import React, { useState } from 'react';
import { Card, Form, Input, Button, message, Typography } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { AdminAPI } from '../services/api';

const { Title } = Typography;

interface LoginPageProps {
    onLoginSuccess: (user: any) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
    const [loading, setLoading] = useState(false);

    const onFinish = async (values: any) => {
        setLoading(true);
        try {
            const response = await AdminAPI.login(values);

            if (response.user.userType !== 'admin') {
                message.error('Bu panele sadece adminler giriş yapabilir.');
                return;
            }

            localStorage.setItem('token', response.accessToken);
            localStorage.setItem('user', JSON.stringify(response.user));

            message.success('Giriş başarılı!');
            onLoginSuccess(response.user);
        } catch (error: any) {
            console.error('Login error:', error);
            const errMsg = error.response?.data?.error?.message || 'Giriş yapılamadı. Lütfen bilgilerinizi kontrol edin.';
            message.error(errMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            background: '#f0f2f5'
        }}>
            <Card style={{ width: 400, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <Title level={2}>Golden Admin</Title>
                    <p>Lütfen yönetici bilgilerinizle giriş yapın</p>
                </div>

                <Form
                    name="login"
                    onFinish={onFinish}
                    layout="vertical"
                    size="large"
                >
                    <Form.Item
                        name="email"
                        rules={[{ required: true, message: 'Lütfen e-posta adresinizi girin!' }, { type: 'email', message: 'Geçerli bir e-posta girin!' }]}
                    >
                        <Input prefix={<UserOutlined />} placeholder="E-posta" />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        rules={[{ required: true, message: 'Lütfen şifrenizi girin!' }]}
                    >
                        <Input.Password prefix={<LockOutlined />} placeholder="Şifre" />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0 }}>
                        <Button type="primary" htmlType="submit" loading={loading} block>
                            Giriş Yap
                        </Button>
                    </Form.Item>
                </Form>

            </Card>
        </div>
    );
};

export default LoginPage;
