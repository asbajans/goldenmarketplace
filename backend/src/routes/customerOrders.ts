/**
 * Customer Orders Route
 * Fetch orders for customers (as opposed to seller orders)
 */

import express, { Request, Response } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import Order, { OrderItem } from '../models/Order';

const router = express.Router();

router.use(authMiddleware);

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { page = 1, limit = 20 } = req.query;

    const orders = await Order.findAndCountAll({
      where: { customerId: userId },
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
    console.error('Customer orders error:', error);
    return res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const order = await Order.findOne({
      where: { id, customerId: userId },
      include: [{ model: OrderItem, as: 'items' }]
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    return res.json(order);
  } catch (error: any) {
    console.error('Customer order detail error:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
