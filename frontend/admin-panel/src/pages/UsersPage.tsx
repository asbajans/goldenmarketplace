import React, { useEffect, useState } from 'react';
import { Table, Card, Button, Space, Modal, Form, Input, Select, Switch, message, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, GiftOutlined } from '@ant-design/icons';
import { AdminAPI } from '../services/api';

const { Option } = Select;

export const UsersPage: React.FC = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    
    // User Edit Modal
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [form] = Form.useForm();

    // Plan Assignment Modal
    const [isAssignModalVisible, setIsAssignModalVisible] = useState(false);
    const [assigningUser, setAssigningUser] = useState<any>(null);
    const [assignForm] = Form.useForm();

    const fetchData = async () => {
        setLoading(true);
        try {
            const [usersRes, plansRes] = await Promise.all([
                AdminAPI.getUsers(),
                AdminAPI.getSubscriptionPlans()
            ]);
            setUsers(Array.isArray(usersRes) ? usersRes : []);
            setPlans(Array.isArray(plansRes) ? plansRes : []);
        } catch (error) {
            message.error('Veriler yüklenemedi');
            setUsers([]);
            setPlans([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAdd = () => {
        setEditingUser(null);
        form.resetFields();
        form.setFieldsValue({ isActive: true, userType: 'customer' });
        setIsModalVisible(true);
    };

    const handleEdit = (record: any) => {
        setEditingUser(record);
        form.setFieldsValue(record);
        setIsModalVisible(true);
    };

    const handleAssignPlan = (record: any) => {
        setAssigningUser(record);
        const userPlan = plans.find(p => p.name === record.subscriptionPlan);
        assignForm.setFieldsValue({
            subscriptionPlanId: userPlan?.id,
            subscriptionStatus: record.subscriptionStatus || 'active'
        });
        setIsAssignModalVisible(true);
    };

    const handleDelete = (id: string) => {
        Modal.confirm({
            title: 'Kullanıcıyı silmek istediğinize emin misiniz?',
            onOk: async () => {
                try {
                    await AdminAPI.deleteUser(id);
                    message.success('Kullanıcı silindi');
                    fetchData();
                } catch (error) {
                    message.error('Kullanıcı silinemedi');
                }
            }
        });
    };

    const parseSubmit = async (values: any) => {
        try {
            if (editingUser) {
                await AdminAPI.updateUser(editingUser.id, values);
                message.success('Kullanıcı güncellendi');
            } else {
                await AdminAPI.createUser(values);
                message.success('Kullanıcı oluşturuldu');
            }
            setIsModalVisible(false);
            fetchData();
        } catch (error: any) {
            const errMsg = error.response?.data?.error;
            message.error(typeof errMsg === 'string' ? errMsg : 'İşlem başarısız');
        }
    };

    const submitAssignPlan = async (values: any) => {
        if (!assigningUser) return;
        try {
            await AdminAPI.assignPlanToUser(assigningUser.id, values);
            message.success('Paket ataması başarılı. Süre bugün itibariyle +1 Ay uzatıldı.');
            setIsAssignModalVisible(false);
            fetchData();
        } catch (error) {
            message.error('Paket atanamadı');
        }
    };

    const columns = [
        { title: 'Ad Soyad', key: 'name', render: (_: any, record: any) => `${record.firstName} ${record.lastName}` },
        { title: 'E-posta', dataIndex: 'email', key: 'email' },
        { title: 'Telefon', dataIndex: 'phone', key: 'phone', render: (phone: string) => phone || '-' },
        {
            title: 'Tip',
            dataIndex: 'userType',
            key: 'userType',
            render: (type: string) => {
                const colors: any = { admin: 'red', seller: 'blue', customer: 'green' };
                return <Tag color={colors[type]}>{type?.toUpperCase()}</Tag>;
            }
        },
        { 
            title: 'Abonelik Paketi', 
            dataIndex: 'subscriptionPlan', 
            key: 'subscriptionPlan',
            render: (val: string, record: any) => {
                if (record.userType !== 'seller') return '-';
                return val ? <Tag color="purple">{val}</Tag> : <Tag color="default">Varsayılan (5 Limit)</Tag>;
            }
        },
        { 
            title: 'Bitiş Tarihi', 
            key: 'endDate',
            render: (_: any, record: any) => {
                if (record.userType !== 'seller' || !record.subscriptionEndDate) return '-';
                return new Date(record.subscriptionEndDate).toLocaleDateString('tr-TR');
            }
        },
        {
            title: 'Durum',
            dataIndex: 'isActive',
            key: 'isActive',
            render: (isActive: boolean) => <Tag color={isActive ? 'success' : 'error'}>{isActive ? 'Aktif' : 'Pasif'}</Tag>
        },
        {
            title: 'İşlemler',
            key: 'actions',
            render: (_: any, record: any) => (
                <Space>
                    {record.userType === 'seller' && (
                        <Button size="small" type="primary" ghost icon={<GiftOutlined />} onClick={() => handleAssignPlan(record)}>
                            Paket Ata
                        </Button>
                    )}
                    <Button icon={<EditOutlined />} type="link" onClick={() => handleEdit(record)} />
                    <Button icon={<DeleteOutlined />} type="link" danger onClick={() => handleDelete(record.id)} />
                </Space>
            )
        }
    ];

    return (
        <Card title="Kullanıcı Yönetimi" extra={<Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>Yeni Kullanıcı</Button>}>
            <Table
                dataSource={users}
                columns={columns}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 15 }}
                scroll={{ x: 'max-content' }}
            />

            <Modal
                title={editingUser ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı'}
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                onOk={() => form.submit()}
            >
                <Form form={form} layout="vertical" onFinish={parseSubmit}>
                    <Space size="large">
                        <Form.Item name="firstName" label="Ad" rules={[{ required: true }]}>
                            <Input />
                        </Form.Item>
                        <Form.Item name="lastName" label="Soyad" rules={[{ required: true }]}>
                            <Input />
                        </Form.Item>
                    </Space>
                    <Form.Item name="email" label="E-posta" rules={[{ required: true, type: 'email' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="phone" label="Telefon Numarası">
                        <Input placeholder="05XX XXX XX XX" />
                    </Form.Item>
                    {!editingUser && (
                        <Form.Item name="password" label="Şifre" rules={[{ required: true, min: 6 }]}>
                            <Input.Password />
                        </Form.Item>
                    )}
                    <Form.Item name="userType" label="Kullanıcı Tipi" rules={[{ required: true }]}>
                        <Select>
                            <Option value="customer">Customer</Option>
                            <Option value="seller">Seller</Option>
                            <Option value="admin">Admin</Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="isActive" label="Aktif mi?" valuePropName="checked">
                        <Switch />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title={`Paket Ata: ${assigningUser?.firstName} ${assigningUser?.lastName}`}
                open={isAssignModalVisible}
                onCancel={() => setIsAssignModalVisible(false)}
                onOk={() => assignForm.submit()}
            >
                <div style={{ background: '#e6f7ff', padding: '12px', borderRadius: 8, marginBottom: 16 }}>
                    <span style={{ color: '#1890ff', fontWeight: 600 }}>Bilgi:</span> Buradan paket atadığınızda satıcının abonelik başlama tarihi bugün olarak ayarlanır ve bitiş tarihi tam <b>30 gün</b> sonrasına uzatılır.
                </div>
                <Form form={assignForm} layout="vertical" onFinish={submitAssignPlan}>
                    <Form.Item name="subscriptionPlanId" label="Abonelik Paketi (Limit)">
                        <Select placeholder="Paket Seçiniz" allowClear>
                            {plans.map(p => (
                                <Option key={p.id} value={p.id}>{p.name} ({p.productLimit} Ürün)</Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item name="subscriptionStatus" label="Abonelik Durumu">
                        <Select>
                            <Option value="active">Aktif</Option>
                            <Option value="inactive">Pasif / Bekleniyor</Option>
                            <Option value="past_due">Gecikmiş Ödeme</Option>
                            <Option value="canceled">İptal Edildi</Option>
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>
        </Card>
    );
};

export default UsersPage;
