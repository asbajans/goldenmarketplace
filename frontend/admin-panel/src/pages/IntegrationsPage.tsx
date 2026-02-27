import React, { useEffect, useState } from 'react';
import { Table, Card, Tag, message } from 'antd';
import { AdminAPI } from '../services/api';

export const IntegrationsPage: React.FC = () => {
    const [integrations, setIntegrations] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchIntegrations = async () => {
        setLoading(true);
        try {
            const data = await AdminAPI.getIntegrations();
            setIntegrations(data);
        } catch (error) {
            message.error('Failed to load integrations');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchIntegrations();
    }, []);

    const columns = [
        { title: 'Marketplace', dataIndex: 'marketplace', key: 'marketplace' },
        { title: 'Satıcı Mağazası', dataIndex: ['store', 'storeName'], key: 'storeName' },
        {
            title: 'Bağlantı Durumu',
            dataIndex: 'isConnected',
            key: 'isConnected',
            render: (isConnected: boolean) => <Tag color={isConnected ? 'success' : 'default'}>{isConnected ? 'Bağlı' : 'Bağlı Değil'}</Tag>
        },
        {
            title: 'Senkronizasyon',
            dataIndex: 'syncStatus',
            key: 'syncStatus',
            render: (status: string) => {
                let color = 'default';
                if (status === 'completed') color = 'success';
                if (status === 'failed') color = 'error';
                if (status === 'in-progress') color = 'processing';
                return <Tag color={color}>{status}</Tag>;
            }
        },
        {
            title: 'Son Senkronizasyon',
            dataIndex: 'lastSyncDate',
            key: 'lastSyncDate',
            render: (date: string) => date ? new Date(date).toLocaleString('tr-TR') : '-'
        }
    ];

    return (
        <Card title="Entegrasyonlar">
            <Table
                dataSource={integrations}
                columns={columns}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 15 }}
            />
        </Card>
    );
};

export default IntegrationsPage;
