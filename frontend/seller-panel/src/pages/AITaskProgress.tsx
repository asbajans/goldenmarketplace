import React, { useEffect, useState, useRef } from 'react';
import { Modal, Progress, List, Tag, Typography, Space, Spin } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, LoadingOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { getAITasks } from '../api/ai';

const { Text } = Typography;

interface Task {
  id: string;
  productId: string;
  taskType: string;
  status: string;
  progress: number;
  error?: string;
  product?: { title: string; sku: string };
}

interface AITaskProgressProps {
  visible: boolean;
  onClose: () => void;
  onAllComplete: () => void;
}

const statusIcon = (status: string) => {
  switch (status) {
    case 'completed': return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
    case 'failed': return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
    case 'processing': return <LoadingOutlined style={{ color: '#1890ff' }} />;
    default: return <ClockCircleOutlined style={{ color: '#faad14' }} />;
  }
};

const statusColor = (status: string) => {
  switch (status) {
    case 'completed': return 'green';
    case 'failed': return 'red';
    case 'processing': return 'processing';
    default: return 'warning';
  }
};

const AITaskProgress: React.FC<AITaskProgressProps> = ({ visible, onClose, onAllComplete }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!visible) {
      if (pollingRef.current) clearInterval(pollingRef.current);
      return;
    }

    const fetchTasks = async () => {
      try {
        const data = await getAITasks();
        setTasks(Array.isArray(data) ? data : []);
        setInitialLoading(false);
      } catch {
        setInitialLoading(false);
      }
    };

    fetchTasks();
    pollingRef.current = setInterval(fetchTasks, 3000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [visible]);

  useEffect(() => {
    if (!visible || tasks.length === 0) return;
    const allDone = tasks.every(t => t.status === 'completed' || t.status === 'failed');
    if (allDone) {
      if (pollingRef.current) clearInterval(pollingRef.current);
      setTimeout(onAllComplete, 2000);
    }
  }, [tasks, visible]);

  const total = tasks.length;
  const completed = tasks.filter(t => t.status === 'completed').length;
  const failed = tasks.filter(t => t.status === 'failed').length;
  const processing = tasks.filter(t => t.status === 'processing' || t.status === 'pending').length;
  const percent = total > 0 ? Math.round(((completed + failed) / total) * 100) : 0;

  return (
    <Modal
      title="AI İşlem Durumu"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={600}
      closable={processing === 0}
      maskClosable={processing === 0}
    >
      {initialLoading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>
      ) : (
        <>
          <div style={{ marginBottom: 20 }}>
            <Progress
              percent={percent}
              success={{ percent: (total > 0 ? (completed / total) * 100 : 0) }}
              format={() => `${completed + failed}/${total}`}
              status={failed > 0 ? 'exception' : (processing > 0 ? 'active' : 'success')}
            />
            <Space style={{ marginTop: 8, justifyContent: 'center', width: '100%', display: 'flex' }}>
              <Tag color="green">{completed} başarılı</Tag>
              {failed > 0 && <Tag color="red">{failed} başarısız</Tag>}
              {processing > 0 && <Tag color="blue">{processing} işleniyor</Tag>}
            </Space>
          </div>

          <List
            size="small"
            dataSource={tasks}
            locale={{ emptyText: 'İşlem bulunamadı' }}
            renderItem={(task) => (
              <List.Item>
                <List.Item.Meta
                  avatar={statusIcon(task.status)}
                  title={
                    <Space>
                      <Text strong>{task.product?.title || task.productId}</Text>
                      <Tag color={statusColor(task.status)}>{task.status}</Tag>
                    </Space>
                  }
                  description={
                    task.status === 'failed'
                      ? <Text type="danger">{task.error || 'Bilinmeyen hata'}</Text>
                      : task.status === 'processing'
                        ? <Text type="secondary">İşleniyor... (%{task.progress || 0})</Text>
                        : task.status === 'completed'
                          ? <Text type="secondary">Tamamlandı</Text>
                          : <Text type="secondary">Sırada bekliyor</Text>
                  }
                />
              </List.Item>
            )}
          />
        </>
      )}
    </Modal>
  );
};

export default AITaskProgress;
