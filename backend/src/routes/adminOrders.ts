import express, { Request, Response } from 'express';
import { Op } from 'sequelize';
import Order, { OrderItem } from '../models/Order';
import Store from '../models/Store';
import User from '../models/User';

const router = express.Router();

router.get('/orders', async (req: Request, res: Response) => {
  try {
    const { status, source, storeId, page = 1, limit = 20, startDate, endDate } = req.query;

    const where: any = {};
    if (status) where.status = status;
    if (source) {
      const sourceStr = source as string;
      if (sourceStr.startsWith('!')) {
        where.source = { [Op.ne]: sourceStr.slice(1) };
      } else {
        where.source = sourceStr;
      }
    }
    if (storeId) where.storeId = storeId;
    
    if (startDate || endDate) {
      where.orderDate = {};
      if (startDate) where.orderDate[Op.gte] = new Date(startDate as string);
      if (endDate) where.orderDate[Op.lte] = new Date(endDate as string);
    }

    const orders = await Order.findAndCountAll({
      where,
      include: [
        { model: OrderItem, as: 'items' },
        { model: Store, as: 'store', attributes: ['id', 'storeName', 'storeSlug'] },
        { model: User, as: 'customer', attributes: ['id', 'email', 'firstName', 'lastName'] },
        { model: User, as: 'seller', attributes: ['id', 'email', 'firstName', 'lastName'] }
      ],
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
    return res.status(500).json({ error: error.message });
  }
});

router.get('/orders/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const order = await Order.findOne({
      where: { id },
      include: [
        { model: OrderItem, as: 'items' },
        { model: Store, as: 'store', attributes: ['id', 'storeName', 'storeSlug'] },
        { model: User, as: 'customer', attributes: ['id', 'email', 'firstName', 'lastName'] },
        { model: User, as: 'seller', attributes: ['id', 'email', 'firstName', 'lastName'] }
      ]
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    return res.json(order);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.patch('/orders/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const order = await Order.findOne({ where: { id } });
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
    return res.status(500).json({ error: error.message });
  }
});

router.get('/stores/:id/commission', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const store = await Store.findOne({ where: { id } });
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    return res.json({
      commissionRate: store.commissionRate,
      defaultShippingDays: store.defaultShippingDays,
      availableShippingCompanies: store.availableShippingCompanies
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.put('/stores/:id/commission', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { commissionRate, defaultShippingDays, availableShippingCompanies } = req.body;

    const store = await Store.findOne({ where: { id } });
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    await store.update({
      commissionRate: commissionRate ?? store.commissionRate,
      defaultShippingDays: defaultShippingDays ?? store.defaultShippingDays,
      availableShippingCompanies: availableShippingCompanies ?? store.availableShippingCompanies
    });

    return res.json(store);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/stats/orders', async (_req: Request, res: Response) => {
  try {
    const totalOrders = await Order.count();
    const pendingOrders = await Order.count({ where: { status: 'pending' } });
    const shippedOrders = await Order.count({ where: { status: 'shipped' } });
    const deliveredOrders = await Order.count({ where: { status: 'delivered' } });
    
    const totalRevenue = await Order.sum('totalAmount', { where: { status: { [Op.ne]: 'cancelled' } } });
    const totalCommission = await Order.sum('commissionAmount', { where: { status: { [Op.ne]: 'cancelled' } } });

    return res.json({
      totalOrders,
      pendingOrders,
      shippedOrders,
      deliveredOrders,
      totalRevenue: totalRevenue || 0,
      totalCommission: totalCommission || 0
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;