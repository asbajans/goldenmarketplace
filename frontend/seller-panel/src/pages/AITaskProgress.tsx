import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Modal, Progress, List, Tag, Typography, Space, Spin, Button, Popconfirm, message, Card, Statistic, Row, Col } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, LoadingOutlined, ClockCircleOutlined, StopOutlined, DeleteOutlined } from '@ant-design/icons';
import { getAITasks, getAITaskSummary, cancelAITasks, clearAITaskLogs, AITaskSummary } from '../api/ai';

const { Text } = Typography;

interface Task {
  id: string;
  productId: string;
  taskType: string;
  status: string;
  progress: number;
  error?: string;
  createdAt?: string;
  product?: { title: string; sku: string };
}

const taskTypeLabel = (t: string) => {
  switch (t) {
    case 'translate': return 'Çeviri';
    case 'generate_content': return 'İçerik üretimi';
    case 'both': return 'İçerik + Çeviri';
    case 'luxury_description': return 'Lüks açıklama';
    default: return t || 'AI işlemi';
  }
};

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
  const [clearing, setClearing] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchTasks = useCallback(async () => {
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
  }, []);

  const handleClearQueue = async () => {
    setCancelling(true);
    try {
      const res = await cancelAITasks();
      message.info(`${res.cancelled || 0} bekleyen işlem iptal edildi`);
      onQueueCleared?.();
      fetchTasks();
    } catch {
      message.error('Kuyruk temizlenemedi');
    } finally {
      setCancelling(false);
    }
  };

  // Yalnızca BİTMİŞ logları siler (completed/failed). Bekleyen/işlenen
  // işlere ve Bull kuyruğuna dokunmaz — arka plan aynen sürer.
  const handleClearLogs = async () => {
    setClearing(true);
    try {
      const res = await clearAITaskLogs();
      message.success(`${res.deleted || 0} bitmiş kayıt silindi. Süren işlere dokunulmadı.`);
      onQueueCleared?.();
      fetchTasks();
    } catch {
      message.error('Loglar silinemedi');
    } finally {
      setClearing(false);
    }
  };

  useEffect(() => {
    if (!visible) {
      if (pollingRef.current) clearInterval(pollingRef.current);
      return;
    }

    fetchTasks();
    pollingRef.current = setInterval(fetchTasks, 3000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [visible, fetchTasks]);

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

  // SON İŞLEM ÖZETİ: aynı dakikada toplu açılan kayıtlar tek iş sayılır
  // (bulk kuyruklama tüm satırları aynı anda yazar). En güncel grup alınır.
  const lastBatch = useMemo(() => {
    if (tasks.length === 0) return null;
    const groups = new Map<string, Task[]>();
    for (const t of tasks) {
      const key = t.createdAt ? t.createdAt.slice(0, 16) : 'bilinmiyor';
      const arr = groups.get(key) || [];
      arr.push(t);
      groups.set(key, arr);
    }
    const latestKey = [...groups.keys()].sort().reverse()[0];
    const items = groups.get(latestKey) || [];
    const byStatus = { completed: 0, failed: 0, pending: 0, processing: 0 };
    for (const t of items) {
      if (t.status === 'completed') byStatus.completed++;
      else if (t.status === 'failed') byStatus.failed++;
      else if (t.status === 'processing') byStatus.processing++;
      else byStatus.pending++;
    }
    const types = [...new Set(items.map(t => taskTypeLabel(t.taskType)))];
    return {
      key: latestKey,
      total: items.length,
      ...byStatus,
      types,
      time: latestKey === 'bilinmiyor' ? '' : latestKey.replace('T', ' ').slice(0, 16),
    };
  }, [tasks]);

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
          {lastBatch && lastBatch.total > 0 && (
            <Card size="small" title={`Son işlem${lastBatch.time ? ` · ${lastBatch.time}` : ''}`} style={{ marginBottom: 16 }} extra={<Text type="secondary">{lastBatch.types.join(', ')}</Text>}>
              <Row gutter={8}>
                <Col span={6}><Statistic title="Ürün" value={lastBatch.total} /></Col>
                <Col span={6}><Statistic title="Başarılı" value={lastBatch.completed} valueStyle={{ color: '#52c41a' }} /></Col>
                <Col span={6}><Statistic title="Başarısız" value={lastBatch.failed} valueStyle={{ color: lastBatch.failed > 0 ? '#ff4d4f' : undefined }} /></Col>
                <Col span={6}><Statistic title="Bekleyen" value={lastBatch.pending + lastBatch.processing} valueStyle={{ color: '#faad14' }} /></Col>
              </Row>
            </Card>
          )}
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
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <Space>
                {processing > 0 && (
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
                )}
                {(completed + failed) > 0 && (
                  <Popconfirm
                    title="Bitmiş loglar silinsin mi?"
                    description="Yalnızca tamamlanan/başarısız kayıtlar silinir. Bekleyen ve işlenen işlere dokunulmaz, arka plan aynen sürer."
                    okText="Evet, Sil"
                    cancelText="Vazgeç"
                    onConfirm={handleClearLogs}
                  >
                    <Button size="small" icon={<DeleteOutlined />} loading={clearing}>
                      Logları Temizle
                    </Button>
                  </Popconfirm>
                )}
              </Space>
              <div style={{ marginTop: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Aşağıdaki çubuk tüm zamanları gösterir; son işin dökümü üstteki karttadır.</Text>
              </div>
            </div>
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
