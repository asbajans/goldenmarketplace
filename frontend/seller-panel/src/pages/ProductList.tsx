
import React, { useEffect, useState } from 'react';
import { Table, Button, Space, message, Modal } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { getProducts, deleteProduct, Product } from '../api/product';
import AddProduct from './AddProduct'; // We will create this next

const ProductList: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const data = await getProducts();
            // data might be array or { data: [] } depending on backend response format
            // In productController: res.status(200).json({ data: rows, pagination: ... })
            // In getProducts: return response.data.data
            // So data is array.
            setProducts(data || []);
        } catch (error) {
            console.error(error);
            message.error('Ürünler yüklenirken hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const handleDelete = async (id: string) => {
        try {
            await deleteProduct(id);
            message.success('Ürün silindi.');
            fetchProducts();
        } catch (error) {
            message.error('Silme işlemi başarısız.');
        }
    };

    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        setIsModalVisible(true);
    };

    const handleAdd = () => {
        setEditingProduct(null);
        setIsModalVisible(true);
    };

    const handleModalClose = (refresh: boolean) => {
        setIsModalVisible(false);
        if (refresh) fetchProducts();
    };

    const columns = [
        { title: 'Resim', dataIndex: 'images', key: 'images', render: (imgs: string[]) => imgs && imgs.length > 0 ? <img src={imgs[0]} alt="product" style={{ width: 50 }} /> : 'Yok' },
        { title: 'Ürün Adı', dataIndex: 'title', key: 'title' },
        { title: 'Kategori', dataIndex: 'category', key: 'category' },
        { title: 'Gram', dataIndex: 'gramWeight', key: 'gramWeight', render: (val: number) => `${val} gr` },
        { title: 'Milyem', dataIndex: 'milyem', key: 'milyem' },
        { title: 'Fiyat (TL)', dataIndex: 'priceTRY', key: 'priceTRY', render: (val: number) => `${Number(val).toLocaleString('tr-TR')} ₺` },
        { title: 'Miktar', dataIndex: 'quantity', key: 'quantity' },
        {
            title: 'İşlemler',
            key: 'actions',
            render: (_: any, record: Product) => (
                <Space>
                    <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} />
                    <Button icon={<DeleteOutlined />} danger onClick={() => handleDelete(record.id)} />
                </Space>
            )
        }
    ];

    return (
        <div>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
                <h2>Ürünlerim</h2>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                    Yeni Ürün Ekle
                </Button>
            </div>

            <Table
                dataSource={products}
                columns={columns}
                rowKey="id"
                loading={loading}
            />

            <Modal
                title={editingProduct ? "Ürün Düzenle" : "Yeni Ürün Ekle"}
                visible={isModalVisible}
                onCancel={() => handleModalClose(false)}
                footer={null}
                destroyOnClose
            >
                <AddProduct
                    initialValues={editingProduct}
                    onSuccess={() => handleModalClose(true)}
                />
            </Modal>
        </div>
    );
};

export default ProductList;
