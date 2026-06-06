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

    const stripeService = require('../services/stripeService').default;
    const Product = require('../models/Product').default;
    const ProductVariant = require('../models/ProductVariant').default;
    const origin = req.headers.origin || process.env.FRONTEND_URL || 'http://localhost:3000';
    const successUrl = `${origin}/order/${order.id}?success=1`;
    const cancelUrl = `${origin}/account/orders/${order.id}`;

    const stripeItems = await Promise.all((order.items || []).map(async (item: any) => {
      let usdPrice = 0;
      if (item.variantId) {
        const v = await ProductVariant.findByPk(item.variantId);
        usdPrice = parseFloat(v?.priceUSD) || 0;
      }
      if (!usdPrice && item.productId) {
        const p = await Product.findByPk(item.productId);
        usdPrice = parseFloat(p?.priceUSD) || 0;
        const discountRate = parseFloat(p?.discountRate) || 0;
        if (discountRate > 0) usdPrice = Math.round(usdPrice * (1 - discountRate / 100) * 100) / 100;
      }
      return {
        name: item.title,
        price: usdPrice || parseFloat(item.unitPrice),
        quantity: item.quantity,
        currency: 'usd'
      };
    }));

    const session = await stripeService.createDirectCheckout(stripeItems, successUrl, cancelUrl, undefined);

    return res.json({ success: true, checkoutUrl: session.url });
  } catch (error: any) {
    console.error('Customer order pay error:', error);
    return res.status(500).json({ error: error.message });
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
