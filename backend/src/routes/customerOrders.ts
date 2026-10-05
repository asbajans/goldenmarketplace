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

router.post('/:id/pay', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const order = await Order.findOne({
      where: { id, customerId: userId, status: 'pending' },
      include: [{ model: OrderItem, as: 'items' }]
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found or already paid' });
    }

    // Same rule as checkout: never open a Stripe session for a disabled method.
    const { assertPaymentMethodAllowed, buildStripeLineItems } = require('../services/checkoutService');
    await assertPaymentMethodAllowed('stripe');

    const stripeService = require('../services/stripeService').default;
    const origin = req.headers.origin || process.env.FRONTEND_URL || 'http://localhost:3000';
    const successUrl = `${origin}/order/${order.id}?success=1`;
    const cancelUrl = `${origin}/account/orders/${order.id}`;

    // Reuses the SAME persisted order items on every retry, so the amount is
    // stable no matter how often the customer presses "pay".
    const { lineItems, stripeTotalUSD } = await buildStripeLineItems((order as any).items || []);

    const session = await stripeService.createDirectCheckout(lineItems, successUrl, cancelUrl, undefined);

    return res.json({ success: true, checkoutUrl: session.url, stripeTotal: stripeTotalUSD, stripeCurrency: 'usd' });
  } catch (error: any) {
    console.error('Customer order pay error:', error);
    return res.status(error.status || 500).json({ error: error.message });
  }
});

router.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const order = await Order.findOne({
      where: { id, customerId: userId }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.status !== 'pending' && order.status !== 'confirmed') {
      return res.status(400).json({ error: 'Order cannot be cancelled in its current status' });
    }

    order.status = 'cancelled';
    await order.save();

    return res.json({ success: true, order });
  } catch (error: any) {
    console.error('Customer order cancel error:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
