/**
 * Cart Routes
 * Customer shopping cart operations
 */

import { Request, Response } from 'express';
const express = require('express');
const router = express.Router();
const { Order, OrderItem } = require('../models/Order');
const Product = require('../models/Product');
const ProductVariant = require('../models/ProductVariant');

function generateOrderNumber() {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timePart = now.toISOString().slice(11, 19).replace(/:/g, '');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `GC${datePart}${timePart}${random}`;
}

function getCartId(req: any): string | null {
  if (req.user?.id) {
    return `user_${req.user.id}`;
  }
  return req.cookies?.guestId || (req.sessionID ? `guest_${req.sessionID}` : null);
}

// Get cart - now supports both guest and authenticated users
router.get('/', async (req: Request, res: Response) => {
  try {
    const cartId = getCartId(req);
    const userId = req.user?.id;
    
    if (!cartId && !userId) {
      return res.json({ items: [], total: 0, count: 0, cartId: null });
    }

    const where: any = { status: 'pending' };
    if (userId) {
      where.customerId = userId;
    } else if (cartId) {
      where.guestId = cartId;
    }

    const cart = await Order.findOne({
      where,
      include: [{ model: OrderItem, as: 'items' }]
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
router.post('/add', async (req: Request, res: Response) => {
  try {
    const { productId, variantId, quantity = 1 } = req.body;
    const userId = req.user?.id;
    const cartId = getCartId(req);

    if (!productId && !variantId) {
      return res.status(400).json({ error: 'Product or variant required' });
    }

    if (!cartId && !userId) {
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

    const cartWhere: any = { status: 'pending' };
    if (userId) {
      cartWhere.customerId = userId;
    } else if (cartId) {
      cartWhere.guestId = cartId;
    }

    let cart = await Order.findOne({
      where: cartWhere
    });

    if (!cart) {
      cart = await Order.create({
        orderNumber: generateOrderNumber(),
        customerId: userId || undefined,
        guestId: cartId || undefined,
        status: 'pending',
        source: 'golden',
        storeId: product.storeId
      });
    }

    const existingItem = await OrderItem.findOne({
      where: {
        orderId: cart.id,
        productId: product.id
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
      } as any);
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

// Update item
router.put('/item/:itemId', async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;
    const userId = req.user?.id;

    if (quantity < 1) {
      return res.status(400).json({ error: 'Quantity must be at least 1' });
    }

    const whereClause: any = userId ? { customerId: userId } : {};

    const item = await OrderItem.findByPk(itemId, {
      include: [{
        model: Order,
        as: 'order',
        where: whereClause
      }]
    } as any);

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    item.quantity = quantity;
    item.totalPrice = item.unitPrice * quantity;
    await item.save();

    return res.json({ success: true, item });
  } catch (error: any) {
    console.error('Update item error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Delete item
router.delete('/item/:itemId', async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;
    const userId = req.user?.id;
    const cartId = getCartId(req);

    const whereClause: any = userId ? { customerId: userId } : { guestId: cartId };

    const item = await OrderItem.findByPk(itemId, {
      include: [{ model: Order, as: 'order', where: whereClause }]
    } as any);

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    await item.destroy();

    return res.json({ success: true });
  } catch (error: any) {
    console.error('Remove item error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Clear cart
router.delete('/clear', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const cartId = getCartId(req);

    if (!userId && !cartId) {
      return res.json({ success: true });
    }

    const whereClause: any = { status: 'pending' };
    if (userId) {
      whereClause.customerId = userId;
    } else if (cartId) {
      whereClause.guestId = cartId;
    }

    const cart = await Order.findOne({ where: whereClause });

    if (cart) {
      await OrderItem.destroy({ where: { orderId: cart.id } });
    }

    return res.json({ success: true });
  } catch (error: any) {
    console.error('Clear cart error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Checkout
router.post('/checkout', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const cartId = getCartId(req);
    const { name, phone, address, city, country, notes } = req.body;

    if (!userId && !cartId) {
      return res.status(400).json({ error: 'Session invalid' });
    }

    const whereClause: any = { status: 'pending' };
    if (userId) {
      whereClause.customerId = userId;
    } else if (cartId) {
      whereClause.guestId = cartId;
    }

    const cart = await Order.findOne({
      where: whereClause,
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