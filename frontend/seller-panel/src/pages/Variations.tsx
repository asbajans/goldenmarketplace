import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Space, Popconfirm, message, Card } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, MinusCircleOutlined } from '@ant-design/icons';
import client from '../api/client';

interface VariationOption {
  id?: string;
  value: string;
}

interface Variation {
  id: string;
  name: string;
  options: VariationOption[];
}

const Variations: React.FC = () => {
  const [variations, setVariations] = useState<Variation[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form] = Form.useForm();

  const fetchVariations = async () => {
    setLoading(true);
    try {
      const { data } = await client.get('/variations');
      setVariations(data || []);
    } catch (error) {
      console.error('Fetch errors', error);
      message.error('Varyasyonlar yüklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVariations();
  }, []);

  const handleCreate = () => {
    setEditingId(null);
    form.resetFields();
    form.setFieldsValue({ options: [{ value: '' }] });
    setIsModalVisible(true);
  };

  const handleEdit = (record: Variation) => {
    setEditingId(record.id);
    form.setFieldsValue({
      name: record.name,
      options: record.options.length > 0 ? record.options.map(o => ({ value: o.value })) : [{ value: '' }]
    });
    setIsModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await client.delete(`/variations/${id}`);
      message.success('Varyasyon şablonu silindi.');
      fetchVariations();
    } catch (error) {
      message.error('Varyasyon silinirken hata oluştu.');
    }
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      if (editingId) {
        await client.put(`/variations/${editingId}`, values);
        message.success('Varyasyon güncellendi.');
      } else {
        await client.post('/variations', values);
        message.success('Varyasyon başarıyla eklendi.');
      }
      setIsModalVisible(false);
      fetchVariations();
    } catch (error) {
      message.error('Kayıt başarısız oldu.');
    }
  };

  const columns = [
    {
      title: 'Varyasyon Şablon Adı',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <strong>{text}</strong>
    },
    {
      title: 'Seçenekler',
      key: 'options',
      render: (_: any, record: Variation) => (
        <Space wrap>
          {record.options.map(opt => (
             <span key={opt.id || opt.value} style={{ background: '#f0f0f0', padding: '2px 8px', borderRadius: '4px' }}>
               {opt.value}
             </span>
          ))}
        </Space>
      )
    },
    {
      title: 'İşlemler',
      key: 'action',
      width: 150,
      render: (_: any, record: Variation) => (
        <Space size="middle">
          <Button icon={<EditOutlined />} type="link" onClick={() => handleEdit(record)} />
          <Popconfirm title="Silmek istediğinize emin misiniz?" onConfirm={() => handleDelete(record.id)}>
            <Button icon={<DeleteOutlined />} type="link" danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card
        title="Varyasyon Şablonları"
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>Yeni Varyasyon Ekle</Button>}
      >
         <Table
            columns={columns}
            dataSource={variations}
            rowKey="id"
            loading={loading}
            pagination={false}
         />
      </Card>

      <Modal
        title={editingId ? 'Varyasyon Şablonunu Düzenle' : 'Yeni Varyasyon Şablonu'}
        open={isModalVisible}
        onOk={handleOk}
        onCancel={() => setIsModalVisible(false)}
        okText="Kaydet"
        cancelText="İptal"
      >
        <Form form={form} layout="vertical" name="variationForm">
          <Form.Item
            name="name"
            label="Şablon Adı (Örn: Zincir Ölçüsü, Renk)"
            rules={[{ required: true, message: 'Lütfen şablon adını giriniz' }]}
          >
            <Input placeholder="Şablon (Özellik) Adı" />
          </Form.Item>

          <div style={{ marginBottom: 8, fontWeight: 500 }}>Varyasyon Seçenekleri</div>
          <Form.List
             name="options"
             rules={[
               {
                 validator: async (_, options) => {
                   if (!options || options.length < 1) {
                     return Promise.reject(new Error('En az 1 seçenek eklemelisiniz.'));
                   }
                 },
               },
             ]}
          >
            {(fields, { add, remove }, { errors }) => (
              <>
                {fields.map((field, index) => (
                  <Form.Item
                    required={false}
                    key={field.key}
                    style={{ marginBottom: 8 }}
                  >
                    <Form.Item
                      {...field}
                      name={[field.name, 'value']}
                      validateTrigger={['onChange', 'onBlur']}
                      rules={[
                        {
                          required: true,
                          whitespace: true,
                          message: "Lütfen seçeneği girin veya alanı silin.",
                        },
                      ]}
                      noStyle
                    >
                      <Input placeholder={`Seçenek ${index + 1} (Örn: 40 cm)`} style={{ width: '85%', marginRight: 8 }} />
                    </Form.Item>
                    {fields.length > 1 ? (
                      <MinusCircleOutlined
                        className="dynamic-delete-button"
                        onClick={() => remove(field.name)}
                        style={{ color: 'red' }}
                      />
                    ) : null}
                  </Form.Item>
                ))}
                <Form.Item>
                  <Button
                    type="dashed"
                    onClick={() => add()}
                    icon={<PlusOutlined />}
                    style={{ width: '85%' }}
                  >
                    Yeni Seçenek Ekle
                  </Button>
                  <Form.ErrorList errors={errors} />
                </Form.Item>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>
    </div>
  );
};

export default Variations;
