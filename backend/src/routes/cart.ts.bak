/**
 * Cart Routes
 * Customer shopping cart operations (simple, using existing Order model)
 */

import express from 'express';
const router = express.Router();
import { Order, OrderItem } from '../models/Order';
import Product from '../models/Product';
import ProductVariant from '../models/ProductVariant';

function generateOrderNumber(): string {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timePart = now.toISOString().slice(11, 19).replace(/:/g, '');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `GC${datePart}${timePart}${random}`;
}

function getGuestId(req: any): string | null {
  return req.cookies?.guestId || (req.sessionID ? `guest_${req.sessionID}` : null);
}

// Get cart
router.get('/', async (req: any, res: Response) => {
  try {
    const guestId = getGuestId(req);
    
    if (!guestId) {
      return res.json({ items: [], total: 0, count: 0, cartId: null });
    }

    const cart = await Order.findOne({
      where: { guestId, status: 'pending' },
      include: [{
        model: OrderItem,
        as: 'items'
      }]
    });

    if (!cart) {
      return res.json({ items: [], total: 0, count: 0, cartId: null });
    }

    const count = cart.items?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0;
    const total = cart.items?.reduce((sum: number, item: any) => sum + (item.totalPrice || 0), 0) || 0;

    return res.json({
      cartId: cart.id,
      items: cart.items || [],
      count,
      total,
      status: cart.status
    });
  } catch (error: any) {
    console.error('Get cart error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Add item to cart
router.post('/add', async (req: any, res: Response) => {
  try {
    const { productId, variantId, quantity = 1 } = req.body;
    const guestId = getGuestId(req);

    if (!productId && !variantId) {
      return res.status(400).json({ error: 'Product or variant required' });
    }

    if (!guestId) {
      return res.status(400).json({ error: 'Session invalid' });
    }

    let product: any;
    let variant: any;
    let unitPrice = 0;

    if (variantId) {
      variant = await ProductVariant.findByPk(variantId);
      if (variant) {
        product = await Product.findByPk(variant.productId);
        unitPrice = parseFloat(variant.priceTRY) || 0;
      }
    } else {
      product = await Product.findByPk(productId);
      unitPrice = parseFloat(product?.priceTRY) || 0;
    }

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    let cart = await Order.findOne({
      where: { guestId, status: 'pending' }
    });

    if (!cart) {
      cart = await Order.create({
        orderNumber: generateOrderNumber(),
        customerId: undefined,
        guestId,
        status: 'pending',
        source: 'golden',
        storeId: product.storeId
      });
    }

    const existingItem = await OrderItem.findOne({
      where: {
        orderId: cart.id,
        productId: product.id,
        ...(variantId ? { variantId } : {})
      }
    } as any);

    if (existingItem) {
      existingItem.quantity += quantity;
      existingItem.totalPrice = existingItem.unitPrice * existingItem.quantity;
      await existingItem.save();
    } else {
      await OrderItem.create({
        orderId: cart.id,
        productId: product.id,
        variantId: variantId || undefined,
        title: product.title,
        sku: variant?.sku || product.sku,
        quantity,
        unitPrice,
        totalPrice: unitPrice * quantity
      });
    }

    const cartItems = await OrderItem.findAll({
      where: { orderId: cart.id }
    });

    const total = cartItems.reduce((sum: number, item: any) => sum + (item.totalPrice || 0), 0);

    return res.json({
      cartId: cart.id,
      items: cartItems,
      count: cartItems.reduce((sum: number, item: any) => sum + item.quantity, 0),
      total,
      status: 'pending'
    });
  } catch (error: any) {
    console.error('Add to cart error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Update item quantity
router.put('/item/:itemId', async (req: any, res: Response) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;
    const guestId = getGuestId(req);

    if (quantity < 1) {
      return res.status(400).json({ error: 'Quantity must be at least 1' });
    }

    const item = await OrderItem.findByPk(itemId, {
      include: [{
        model: Order,
        as: 'order',
        where: { guestId }
      }]
    });

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    item.quantity = quantity;
    item.totalPrice = item.unitPrice * quantity;
    await item.save();

    const order = await Order.findByPk(item.orderId);
    if (order) {
      const items = await OrderItem.findAll({ where: { orderId: order.id } });
      const newTotal = items.reduce((sum: number, i: any) => sum + (i.totalPrice || 0), 0);
      order.totalTRY = newTotal;
      await order.save();
    }

    return res.json({ success: true, item });
  } catch (error: any) {
    console.error('Update item error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Remove item
router.delete('/item/:itemId', async (req: any, res: Response) => {
  try {
    const { itemId } = req.params;
    const guestId = getGuestId(req);

    const item = await OrderItem.findByPk(itemId, {
      include: [{
        model: Order,
        as: 'order',
        where: { guestId }
      }]
    });

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const orderId = item.orderId;
    await item.destroy();

    const order = await Order.findByPk(orderId);
    if (order) {
      const items = await OrderItem.findAll({ where: { orderId: order.id } });
      const newTotal = items.reduce((sum: number, i: any) => sum + (i.totalPrice || 0), 0);
      order.totalTRY = newTotal;
      await order.save();
    }

    return res.json({ success: true });
  } catch (error: any) {
    console.error('Remove item error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Clear cart
router.delete('/clear', async (req: any, res: Response) => {
  try {
    const guestId = getGuestId(req);

    if (!guestId) {
      return res.json({ success: true });
    }

    const cart = await Order.findOne({
      where: { guestId, status: 'pending' }
    });

    if (cart) {
      await OrderItem.destroy({ where: { orderId: cart.id } });
    }

    return res.json({ success: true });
  } catch (error: any) {
    console.error('Clear cart error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Checkout - create order from cart
router.post('/checkout', async (req: any, res: any) => {
  try {
    const guestId = getGuestId(req);
    const { name, phone, address, city, country, notes } = req.body;

    if (!guestId) {
      return res.status(400).json({ error: 'Session invalid' });
    }

    const cart = await Order.findOne({
      where: { guestId, status: 'pending' },
      include: [{ model: OrderItem, as: 'items' }]
    });

    if (!cart || !cart.items?.length) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    if (!name || !address || !city) {
      return res.status(400).json({ error: 'Shipping address required' });
    }

    const orderTotal = cart.items.reduce((sum: number, item: any) => sum + (item.totalPrice || 0), 0);

    const order = await cart.update({
      status: 'confirmed',
      subtotal: orderTotal,
      totalAmount: orderTotal,
      shippingAddress: { name, address, city, country: country || 'Turkey', phone },
      customerNote: notes || ''
    } as any);

    return res.json({
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      total: orderTotal
    });
  } catch (error: any) {
    console.error('Checkout error:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;