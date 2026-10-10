import React, { useEffect, useState, useRef } from 'react';
import { Modal, Progress, List, Tag, Typography, Space, Spin, Button, Popconfirm, message } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, LoadingOutlined, ClockCircleOutlined, StopOutlined } from '@ant-design/icons';
import { getAITasks, getAITaskSummary, cancelAITasks, AITaskSummary } from '../api/ai';

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
  onQueueCleared?: () => void;
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

const AITaskProgress: React.FC<AITaskProgressProps> = ({ visible, onClose, onAllComplete, onQueueCleared }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [summary, setSummary] = useState<AITaskSummary>({ total: 0, pending: 0, processing: 0, completed: 0, failed: 0 });
  const [initialLoading, setInitialLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleClearQueue = async () => {
    setCancelling(true);
    try {
      const res = await cancelAITasks();
      message.info(`${res.cancelled || 0} bekleyen işlem iptal edildi`);
      onQueueCleared?.();
    } catch {
      message.error('Kuyruk temizlenemedi');
    } finally {
      setCancelling(false);
    }
  };

  useEffect(() => {
    if (!visible) {
      if (pollingRef.current) clearInterval(pollingRef.current);
      return;
    }

    const fetchTasks = async () => {
      try {
        // Liste son 200 işi gösterir (detay için); sayılar özet endpointten
        // gelir — 200 barajına takılmaz.
        const [data, sum] = await Promise.all([
          getAITasks(undefined, 200),
          getAITaskSummary().catch(() => null),
        ]);
        setTasks(Array.isArray(data) ? data : []);
        if (sum) setSummary(sum);
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
    if (!visible) return;
    // Tamamlanma kararı özet sayılara göre (liste 200'de kesik olabilir).
    if (summary.total > 0 && summary.pending === 0 && summary.processing === 0) {
      if (pollingRef.current) clearInterval(pollingRef.current);
      setTimeout(onAllComplete, 2000);
    }
  }, [summary, visible]);

  const total = summary.total;
  const completed = summary.completed;
  const failed = summary.failed;
  const processing = summary.pending + summary.processing;
  const percent = total > 0 ? Math.round(((completed + failed) / total) * 100) : 0;

  return (
    <Modal
      title="AI İşlem Durumu"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={600}
      // İş sürerken de kapatılabilsin — izleme ürün listesindeki
      // "AI İzle" butonundan devam eder, iş arka planda sürer.
      closable
      maskClosable
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
            {processing > 0 && (
              <div style={{ textAlign: 'center', marginTop: 8 }}>
                <Popconfirm
                  title="Kuyruk temizlensin mi?"
                  description="Bekleyen tüm işlemler iptal edilir. Bitenler durur, kalanları yeniden seçip çevirebilirsin."
                  okText="Evet, Temizle"
                  cancelText="Vazgeç"
                  onConfirm={handleClearQueue}
                >
                  <Button size="small" danger icon={<StopOutlined />} loading={cancelling}>
                    Kuyruğu Temizle
                  </Button>
                </Popconfirm>
              </div>
            )}
          </div>

          <List
            size="small"
            dataSource={tasks}
            locale={{ emptyText: 'İşlem bulunamadı' }}
            header={total > tasks.length ? <Text type="secondary">Son {tasks.length} işlem gösteriliyor (toplam {total})</Text> : undefined}
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
                      ? (task.error || '').includes('iptal')
                        ? <Text type="secondary">İptal edildi</Text>
                        : <Text type="danger">{task.error || 'Bilinmeyen hata'}</Text>
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
