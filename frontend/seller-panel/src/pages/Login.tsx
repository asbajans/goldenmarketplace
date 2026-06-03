
import React, { useState } from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { login, googleAuth } from '../api/auth';

const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID'; // Google Console'dan alınacak

const Login: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
    const [loading, setLoading] = useState(false);

    const handleGoogleLogin = async () => {
        try {
            window.open(
                `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(window.location.origin + '/auth/google/callback')}&response_type=code&scope=email%20profile&access_type=offline`,
                'Google Login',
                'width=500,height=600'
            );
            
            // Popup'tan mesaj bekle
            window.addEventListener('message', async (event) => {
                if (event.data.type === 'google_auth') {
                    try {
                        await googleAuth(event.data.token);
                        message.success('Google ile giriş başarılı!');
                        onLogin();
                    } catch (error: any) {
                        message.error('Google ile giriş başarısız!');
                    }
                }
            });
        } catch (error) {
            message.error('Google ile giriş açılamadı!');
        }
    };

    const onFinish = async (values: any) => {
        setLoading(true);
        try {
            await login(values.email, values.password);
            message.success('Giriş başarılı!');
            onLogin();
        } catch (error: any) {
            console.error(error);
            message.error(error.response?.data?.error?.message || 'Giriş başarısız!');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f0f2f5' }}>
            <Card title="Satıcı Girişi" style={{ width: 300 }}>
                <Form
                    name="login"
                    initialValues={{ remember: true }}
                    onFinish={onFinish}
                >
                    <Form.Item
                        name="email"
                        rules={[{ required: true, message: 'Lütfen email giriniz!' }]}
                    >
                        <Input prefix={<UserOutlined />} placeholder="Email" />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        rules={[{ required: true, message: 'Lütfen şifre giriniz!' }]}
                    >
                        <Input.Password prefix={<LockOutlined />} placeholder="Şifre" />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={loading} block style={{ marginBottom: '10px' }}>
                            Giriş Yap
                        </Button>
                        <Button onClick={handleGoogleLogin} block style={{ marginBottom: '10px', background: '#4285F4', color: 'white', borderColor: '#4285F4' }}>
                            Google ile Giriş Yap
                        </Button>
                        <div style={{ textAlign: 'center' }}>
                            Hesabınız yok mu? <Link to="/register">Hemen Kaydol</Link>
                        </div>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
};

export default Login;
