import express, { Request, Response } from 'express';
import Order, { OrderItem, OrderSource } from '../models/Order';
import Store from '../models/Store';
import User from '../models/User';

const router = express.Router();

import { authMiddleware, sellerMiddleware } from '../middleware/authMiddleware';
router.use(authMiddleware, sellerMiddleware);

function generateOrderNumber(): string {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timePart = now.toISOString().slice(11, 19).replace(/:/g, '');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `GC${datePart}${timePart}${random}`;
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user || {};
    const userId = user.id || user.userId || user.sub;
    
    if (!userId) {
      console.error('[GET /orders] Missing user ID in token. Token payload:', user);
      return res.status(401).json({ error: 'Lütfen oturumunuzu kapatıp tekrar giriş yapın (Token geçersiz).' });
    }

    const { status, source, page = 1, limit = 20 } = req.query;

    const store = await Store.findOne({ where: { userId } });
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    const where: any = { storeId: store.id };
    if (status) where.status = status;
    if (source) where.source = source;

    const orders = await Order.findAndCountAll({
      where,
      include: [{ model: OrderItem, as: 'items' }],
      order: [['createdAt', 'DESC']],
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit)
    });

    return res.json({
      orders: orders.rows,
      total: orders.count,
      page: Number(page),
      totalPages: Math.ceil(orders.count / Number(limit))
    });
  } catch (error: any) {
    console.error('[GET /orders] Error:', error);
    return res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;

    const store = await Store.findOne({ where: { userId } });
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    const order = await Order.findOne({
      where: { id, storeId: store.id },
      include: [
        { model: OrderItem, as: 'items' },
        { model: User, as: 'customer', attributes: ['id', 'email', 'firstName', 'lastName'] }
      ]
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    return res.json(order);
  } catch (error: any) {
    console.error('[GET /orders/:id] Error:', error);
    return res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const {
      customerId,
      items,
      shippingCost = 0,
      shippingAddress,
      billingAddress,
      customerNote,
      source = 'golden'
    } = req.body;

    const store = await Store.findOne({ where: { userId } });
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    const subtotal = items.reduce((sum: number, item: any) => sum + (item.unitPrice * item.quantity), 0);
    const totalAmount = Number(subtotal) + Number(shippingCost);
    const commissionRate = store.commissionRate || 10;
    const commissionAmount = Number(totalAmount) * (Number(commissionRate) / 100);
    const sellerEarnings = Number(totalAmount) - commissionAmount;

    const order = await Order.create({
      orderNumber: generateOrderNumber(),
      customerId,
      sellerId: userId,
      storeId: store.id,
      status: 'pending',
      subtotal,
      shippingCost,
      totalAmount,
      commissionRate,
      commissionAmount,
      sellerEarnings,
      currency: 'TRY', // Domestic manual orders are TRY by default
      shippingTime: store.defaultShippingDays || 3,
      shippingDeadline: new Date(Date.now() + (store.defaultShippingDays || 3) * 24 * 60 * 60 * 1000),
      orderDate: new Date(),
      source: source as OrderSource,
      shippingAddress,
      billingAddress,
      customerNote
    });

    for (const item of items) {
      await OrderItem.create({
        orderId: order.id,
        productId: item.productId,
        variantId: item.variantId,
        title: item.title,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.unitPrice * item.quantity
      });
    }

    const fullOrder = await Order.findOne({
      where: { id: order.id },
      include: [{ model: OrderItem, as: 'items' }]
    });

    return res.status(201).json(fullOrder);
  } catch (error: any) {
    console.error('[POST /orders] Error:', error);
    return res.status(500).json({ error: error.message });
  }
});

router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const store = await Store.findOne({ where: { userId } });
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    const order = await Order.findOne({
      where: { id, storeId: store.id }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const updateData: any = { status };
    if (status === 'confirmed') {
      updateData.confirmedDate = new Date();
    } else if (status === 'shipped') {
      updateData.shippedDate = new Date();
    } else if (status === 'delivered') {
      updateData.deliveredDate = new Date();
    }

    await order.update(updateData);

    return res.json(order);
  } catch (error: any) {
    console.error('[PATCH /orders/:id/status] Error:', error);
    return res.status(500).json({ error: error.message });
  }
});

router.patch('/:id/shipping', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const { trackingNumber, shippingCompany, shippingTime } = req.body;

    const store = await Store.findOne({ where: { userId } });
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    const order = await Order.findOne({
      where: { id, storeId: store.id }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const updateData: any = {};
    if (trackingNumber !== undefined) updateData.trackingNumber = trackingNumber;
    if (shippingCompany !== undefined) updateData.shippingCompany = shippingCompany;
    if (shippingTime !== undefined) {
      updateData.shippingTime = shippingTime;
      updateData.shippingDeadline = new Date(Date.now() + shippingTime * 24 * 60 * 60 * 1000);
    }

    await order.update(updateData);

    return res.json(order);
  } catch (error: any) {
    console.error('[PATCH /orders/:id/shipping] Error:', error);
    return res.status(500).json({ error: error.message });
  }
});

router.patch('/:id/return', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const { reason, items } = req.body;

    const store = await Store.findOne({ where: { userId } });
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    const order = await Order.findOne({
      where: { id, storeId: store.id }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.status !== 'delivered' && order.status !== 'shipped') {
      return res.status(400).json({ error: 'Only delivered or shipped orders can be returned' });
    }

    await order.update({
      status: 'returned',
      customerNote: reason ? `İade Sebebi: ${reason}` : order.customerNote
    });

    for (const item of items || []) {
      await OrderItem.update(
        { quantity: item.quantity },
        { where: { id: item.id } }
      );
    }

    return res.json(order);
  } catch (error: any) {
    console.error('[PATCH /orders/:id/return] Error:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;