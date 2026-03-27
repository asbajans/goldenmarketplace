import React, { useState } from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../api/auth';

const Register: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const onFinish = async (values: any) => {
        setLoading(true);
        try {
            await register({
                ...values,
                userType: 'seller'
            });
            message.success('Kayıt alındı. Yönetici onayından sonra giriş yapabilirsiniz.');
            navigate('/login');
        } catch (error: any) {
            console.error(error);
            message.error(error.response?.data?.error?.message || 'Kayıt başarısız!');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f0f2f5' }}>
            <Card title="Satıcı Kaydı" style={{ width: 400 }}>
                <Form
                    name="register"
                    onFinish={onFinish}
                    layout="vertical"
                >
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <Form.Item
                            name="firstName"
                            label="Ad"
                            rules={[{ required: true, message: 'Lütfen adınızı giriniz!' }]}
                            style={{ flex: 1 }}
                        >
                            <Input placeholder="Ad" />
                        </Form.Item>
                        <Form.Item
                            name="lastName"
                            label="Soyad"
                            rules={[{ required: true, message: 'Lütfen soyadınızı giriniz!' }]}
                            style={{ flex: 1 }}
                        >
                            <Input placeholder="Soyad" />
                        </Form.Item>
                    </div>

                    <Form.Item
                        name="email"
                        label="E-posta"
                        rules={[
                            { required: true, message: 'Lütfen email giriniz!' },
                            { type: 'email', message: 'Geçerli bir email giriniz!' }
                        ]}
                    >
                        <Input prefix={<MailOutlined />} placeholder="E-posta" />
                    </Form.Item>

                    <Form.Item
                        name="phone"
                        label="Telefon Numarası"
                        rules={[{ required: true, message: 'Lütfen telefon numaranızı giriniz!' }]}
                    >
                        <Input placeholder="05XX XXX XX XX" />
                    </Form.Item>

                    <Form.Item
                        name="storeName"
                        label="Mağaza Adı"
                        rules={[{ required: true, message: 'Lütfen mağaza adınızı giriniz!' }]}
                    >
                        <Input placeholder="Mağazanızın Adı" />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        label="Şifre"
                        rules={[
                            { required: true, message: 'Lütfen şifre giriniz!' },
                            { min: 6, message: 'Şifre en az 6 karakter olmalıdır!' }
                        ]}
                    >
                        <Input.Password prefix={<LockOutlined />} placeholder="Şifre" />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={loading} block>
                            Kayıt Ol
                        </Button>
                    </Form.Item>

                    <div style={{ textAlign: 'center' }}>
                        Zaten hesabınız var mı? <Link to="/login">Giriş Yap</Link>
                    </div>
                </Form>
            </Card>
        </div>
    );
};

export default Register;
