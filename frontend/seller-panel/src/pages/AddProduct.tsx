
import React, { useState } from 'react';
import { Form, Input, Button, InputNumber, message } from 'antd';
import { createProduct } from '../api/product';
// We might need updateProduct too later

interface AddProductProps {
    initialValues?: any;
    onSuccess: () => void;
}

const AddProduct: React.FC<AddProductProps> = ({ initialValues, onSuccess }) => {
    const [loading, setLoading] = useState(false);

    const onFinish = async (values: any) => {
        setLoading(true);
        try {
            // Hardcoding storeId for now or should handle it better on backend?
            // Backend createProduct requires storeId.
            // Let's cheat and passing a "placeholder" and fix backend to use user's store?
            // Or just fetch storeId beforehand.

            // Actually, we don't have storeId easily.
            // Let's fix backend to NOT require storeId in body, but take it from User's store.
            // But User can have multiple stores? Model says One User -> Many Stores? 
            // Model Store: userId references Users. 
            // Usually in multi-vendor, 1 User = 1 Store (or 1 Seller = 1 Store).
            // Let's assume 1-1 for simplicity or just pick the first one.

            // For Phase 1 Wiring:
            // I will use a hardcoded store ID if I can find it, OR
            // I will modify backend to find the store for me.
            // Modify backend `createProduct` is safer.

            await createProduct({
                ...values,
                storeId: 'hardcoded-or-backend-inferred', // TO BE FIXED
                images: [] // Placeholder
            });

            message.success('Ürün kaydedildi!');
            onSuccess();
        } catch (error: any) {
            console.error(error);
            message.error('Hata oluştu: ' + (error.response?.data?.error?.message || 'Bilinmeyen hata'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Form
            layout="vertical"
            initialValues={initialValues}
            onFinish={onFinish}
        >
            <Form.Item name="title" label="Ürün Adı" rules={[{ required: true }]}>
                <Input />
            </Form.Item>
            <Form.Item name="category" label="Kategori" rules={[{ required: true }]}>
                <Input />
            </Form.Item>
            <Form.Item name="basePrice" label="Fiyat (TL)" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
            <Form.Item name="quantity" label="Stok Adedi" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
            <Form.Item name="sku" label="SKU (Stok Kodu)" rules={[{ required: true }]}>
                <Input />
            </Form.Item>
            <Form.Item name="description" label="Açıklama">
                <Input.TextArea />
            </Form.Item>

            <Form.Item>
                <Button type="primary" htmlType="submit" loading={loading} block>
                    Kaydet
                </Button>
            </Form.Item>
        </Form>
    );
};

export default AddProduct;
