import express, { Request, Response } from 'express';
import Store from '../models/Store';
import { Order, OrderItem, OrderSource } from '../models/Order';
import MarketplaceIntegration from '../models/MarketplaceIntegration';

const router = express.Router();

function generateOrderNumber(): string {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timePart = now.toISOString().slice(11, 19).replace(/:/g, '');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `GC${datePart}${timePart}${random}`;
}

async function importExternalOrder(storeId: string, externalOrder: any, source: OrderSource) {
  const store = await Store.findByPk(storeId);
  if (!store) return null;

  const items = externalOrder.items || [{ 
    productId: externalOrder.productId || 'unknown',
    title: externalOrder.title || 'Ürün',
    sku: externalOrder.sku || 'N/A',
    quantity: externalOrder.quantity || 1,
    unitPrice: externalOrder.price || externalOrder.totalAmount || 0,
    totalPrice: externalOrder.totalAmount || externalOrder.price || 0
  }];

  const subtotal = items.reduce((sum: number, item: any) => sum + Number(item.totalPrice || item.unitPrice * item.quantity), 0);
  const shippingCost = Number(externalOrder.shippingCost) || 0;
  const totalAmount = subtotal + shippingCost;
  const commissionRate = store.commissionRate || 10;
  const commissionAmount = totalAmount * (commissionRate / 100);
  const sellerEarnings = totalAmount - commissionAmount;

  const order = await Order.create({
    orderNumber: generateOrderNumber(),
    customerId: externalOrder.customerId || '00000000-0000-0000-0000-000000000000',
    sellerId: store.userId,
    storeId: store.id,
    status: 'pending',
    subtotal,
    shippingCost,
    totalAmount,
    commissionRate,
    commissionAmount,
    sellerEarnings,
    shippingTime: store.defaultShippingDays || 3,
    shippingDeadline: new Date(Date.now() + (store.defaultShippingDays || 3) * 24 * 60 * 60 * 1000),
    orderDate: new Date(),
    source,
    externalOrderId: externalOrder.orderId || externalOrder.id,
    shippingAddress: externalOrder.shippingAddress || externalOrder.shipping_address,
    customerNote: externalOrder.note || externalOrder.customerNote
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
      totalPrice: item.totalPrice || item.unitPrice * item.quantity
    });
  }

  return order;
}

router.get('/sync/:marketplace', async (req: Request, res: Response) => {
  try {
    const { marketplace } = req.params;
    const userId = (req as any).user?.id;

    const store = await Store.findOne({ where: { userId } });
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    const integration = await MarketplaceIntegration.findOne({ 
      where: { userId, platform: marketplace, isActive: true } 
    });

    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    try {
      const marketplaceService = require(`../services/integrations/${marketplace}Integration`);
      const externalOrders = await marketplaceService.getOrders({
        apiKey: integration.apiKey,
        apiSecret: integration.apiSecret,
        accessToken: integration.accessToken,
        refreshToken: integration.refreshToken,
        shopId: integration.shopId
      });

      let totalImported = 0;
      for (const extOrder of externalOrders) {
        const existingOrder = await Order.findOne({
          where: {
            storeId: store.id,
            externalOrderId: extOrder.orderId || extOrder.id,
            source: marketplace as OrderSource
          }
        });

        if (!existingOrder) {
          await importExternalOrder(store.id, extOrder, marketplace as OrderSource);
          totalImported++;
        }
      }

      res.json({ imported: totalImported });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/import', async (req: Request, res: Response) => {
  try {
    const { orders, storeId, source } = req.body;

    if (!orders || !Array.isArray(orders) || orders.length === 0) {
      return res.status(400).json({ error: 'orders array required' });
    }

    const store = await Store.findByPk(storeId);
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    let imported = 0;
    for (const order of orders) {
      const existingOrder = await Order.findOne({
        where: {
          storeId,
          externalOrderId: order.orderId || order.id,
          source: source as OrderSource
        }
      });

      if (!existingOrder) {
        await importExternalOrder(storeId, order, source as OrderSource);
        imported++;
      }
    }

    res.json({ imported });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;