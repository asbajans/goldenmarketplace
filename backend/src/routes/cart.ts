/**
 * Cart Routes
 * Customer shopping cart operations
 */

import { Request, Response } from 'express';
const express = require('express');
const router = express.Router();
const { Order, OrderItem } = require('../models/Order');
const Product = require('../models/Product').default;
const ProductVariant = require('../models/ProductVariant').default;
const Store = require('../models/Store').default;

function generateOrderNumber() {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timePart = now.toISOString().slice(11, 19).replace(/:/g, '');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `GC${datePart}${timePart}${random}`;
}

function extractUser(req: any): { id: string; email: string; userType: string } | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  if (!token) return null;
  
  try {
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded && decoded.id) {
      return decoded;
    }
  } catch (e) {
    // Ignore JWT errors
  }
  return null;
}

function getCartId(req: any): string | null {
  const user = extractUser(req);
  if (user?.id) {
    return `user_${user.id}`;
  }
  return req.cookies?.guestId || (req.sessionID ? `guest_${req.sessionID}` : null);
}

// Get cart - supports both guest and authenticated users
router.get('/', async (req: Request, res: Response) => {
  try {
    const user = extractUser(req);
    const userId = user?.id;
    const cartId = getCartId(req);
    
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

    const count = cart.items?.reduce((sum: number, item: any) => sum + (parseInt(item.quantity, 10) || 0), 0) || 0;
    const total = cart.items?.reduce((sum: number, item: any) => sum + (parseFloat(item.totalPrice) || 0), 0) || 0;

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
// Body: { productId?, variantId?, quantity = 1, replace = false }
// `replace: true` sets the absolute quantity instead of incrementing —
// storefronts should use it when (re-)syncing the cart on page mount so a
// repeated call can never inflate the quantity (and the Stripe amount).
router.post('/add', async (req: Request, res: Response) => {
  try {
    const { productId, variantId, quantity = 1, replace = false } = req.body;
    const userId = extractUser(req)?.id;
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

    // Apply discount if available
    const discountRate = parseFloat(product?.discountRate) || 0;
    if (discountRate > 0) {
      unitPrice = parseFloat(product?.discountedPrice) || unitPrice;
    }

    const cartWhere: any = { status: 'pending' };
    if (userId) {
      cartWhere.customerId = userId;
    } else if (cartId) {
      cartWhere.guestId = cartId;
    }

    let cart = await Order.findOne({ where: cartWhere });

    if (!cart) {
      const store = await Store.findByPk(product.storeId);
      cart = await Order.create({
        orderNumber: generateOrderNumber(),
        customerId: userId || undefined,
        guestId: cartId || undefined,
        status: 'pending',
        source: 'golden',
        storeId: product.storeId,
        sellerId: store ? store.userId : null
      });
    }

    const existingItem = await OrderItem.findOne({
      where: { orderId: cart.id, productId: product.id }
    } as any);

    if (existingItem) {
      if (replace) {
        existingItem.quantity = quantity;
      } else {
        existingItem.quantity = parseInt(existingItem.quantity, 10) + quantity;
      }
      existingItem.totalPrice = parseFloat(existingItem.unitPrice) * existingItem.quantity;
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

    const cartItems = await OrderItem.findAll({ where: { orderId: cart.id } });
    const total = cartItems.reduce((sum: number, item: any) => sum + (parseFloat(item.totalPrice) || 0), 0);

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
    const userId = extractUser(req)?.id;

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
    const userId = extractUser(req)?.id;
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
    const userId = extractUser(req)?.id;
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
// Supports three modes:
//   0. orderId in body (idempotent retry) - reuses a pending order, only
//      refreshes the Stripe session so the amount never grows on retry
//   1. cartItems[] in body (frontend local cart) - creates order from scratch
//   2. DB pending cart (legacy session/token cart)
router.post('/checkout', async (req: Request, res: Response) => {
  try {
    const user = extractUser(req);
    const userId = user?.id;
    const cartId = getCartId(req);
    const { name, phone, address, city, country, notes, cartItems, paymentMethod, orderId } = req.body;

    // Enforce admin payment toggles BEFORE any order writes, so the
    // storefront can never charge with a method that is OFF in admin panel.
    const { assertPaymentMethodAllowed, buildStripeLineItems } = require('../services/checkoutService');
    await assertPaymentMethodAllowed(paymentMethod);

    let finalNotes = notes || '';
    if (paymentMethod === 'bankTransfer') {
      finalNotes = `[Ödeme: Banka Havalesi] ${finalNotes}`.trim();
    } else if (paymentMethod === 'stripe') {
      finalNotes = `[Ödeme: Kredi Kartı] ${finalNotes}`.trim();
    }

    if (!name || !address || !city) {
      return res.status(400).json({ error: 'Shipping address required (name, address, city)' });
    }

    // ── MODE 0: Retry of an existing pending order (idempotent) ─────────────
    // The frontend must pass the orderId returned by the first checkout call
    // when the customer goes back and presses "pay" again. The SAME order and
    // SAME items are reused — only a fresh Stripe session is created — so the
    // charged amount can never grow between retries.
    if (orderId) {
      const orderScope: any = { id: orderId, status: 'pending' };
      if (userId) {
        orderScope.customerId = userId;
      }

      const existing = await Order.findOne({
        where: orderScope,
        include: [{ model: OrderItem, as: 'items' }]
      });

      if (!existing) {
        return res.status(404).json({ error: 'Pending order not found. Please start a new checkout.' });
      }
      if (!existing.items?.length) {
        return res.status(400).json({ error: 'Cart is empty' });
      }

      const retryTotal = existing.items.reduce((sum: number, item: any) => sum + (parseFloat(item.totalPrice) || 0), 0);

      await existing.update({
        status: paymentMethod === 'stripe' ? 'pending' : 'confirmed',
        subtotal: retryTotal,
        totalAmount: retryTotal,
        shippingAddress: { name, address, city, country: country || 'Turkey', phone },
        customerNote: finalNotes
      } as any);

      if (paymentMethod === 'stripe') {
        const stripeService = require('../services/stripeService').default;
        const origin = req.headers.origin || process.env.FRONTEND_URL || 'http://localhost:3000';
        const successUrl = `${origin}/order/${existing.id}?success=1`;
        const cancelUrl = `${origin}/checkout`;

        const { lineItems, stripeTotalUSD } = await buildStripeLineItems(existing.items);
        const stripeSession = await stripeService.createDirectCheckout(lineItems, successUrl, cancelUrl, undefined);

        return res.json({
          success: true,
          orderId: existing.id,
          orderNumber: existing.orderNumber,
          total: retryTotal,
          stripeTotal: stripeTotalUSD,
          stripeCurrency: 'usd',
          checkoutUrl: stripeSession.url
        });
      }

      return res.json({
        success: true,
        orderId: existing.id,
        orderNumber: existing.orderNumber,
        total: retryTotal
      });
    }

    // ── MODE 1: Frontend sends cartItems directly (local cart) ──────────────
    if (Array.isArray(cartItems) && cartItems.length > 0) {
      const orderItems: any[] = [];
      let orderTotal = 0;
      let storeId: string | null = null;
      let sellerId: string | null = null;

      for (const ci of cartItems) {
        let product: any = null;
        let variant: any = null;
        let unitPrice = 0;

        if (ci.variantId) {
          variant = await ProductVariant.findByPk(ci.variantId);
          if (variant) {
            product = await Product.findByPk(variant.productId);
            unitPrice = parseFloat(variant.priceTRY) || 0;
          }
        }
        if (!product && ci.productId) {
          product = await Product.findByPk(ci.productId);
          unitPrice = parseFloat(product?.priceTRY) || 0;
        }

        if (!product) {
          return res.status(400).json({ error: `Product not found: ${ci.productId || ci.variantId}` });
        }

        if (!storeId) {
          storeId = product.storeId;
          // Get seller from store
          const Store = require('../models/Store').default;
          const store = await Store.findByPk(storeId);
          sellerId = store?.userId || null;
        }

        // Apply discount to the TRY order price (Stripe USD price is derived
        // centrally in buildStripeLineItems so both stay consistent)
        const discountRate = parseFloat(product?.discountRate) || 0;
        if (discountRate > 0) {
          unitPrice = parseFloat(product?.discountedPrice) || unitPrice;
        }

        const qty = ci.quantity || 1;
        const total = unitPrice * qty;
        orderTotal += total;

        orderItems.push({
          productId: product.id,
          variantId: variant?.id || null,
          title: product.title,
          sku: variant?.sku || product.sku || 'N/A',
          quantity: qty,
          unitPrice,
          totalPrice: total
        });
      }

      if (!storeId || !sellerId) {
        return res.status(400).json({ error: 'Could not determine store for order' });
      }

      const newOrder = await Order.create({
        orderNumber: generateOrderNumber(),
        customerId: userId || sellerId, // fallback to seller if guest (temporary)
        sellerId,
        storeId,
        status: paymentMethod === 'stripe' ? 'pending' : 'confirmed',
        subtotal: orderTotal,
        shippingCost: 0,
        totalAmount: orderTotal,
        commissionRate: 10,
        commissionAmount: orderTotal * 0.1,
        sellerEarnings: orderTotal * 0.9,
        shippingTime: 3,
        orderDate: new Date(),
        source: 'golden',
        shippingAddress: { name, address, city, country: country || 'Turkey', phone },
        customerNote: finalNotes
      } as any);

      for (const item of orderItems) {
        await OrderItem.create({ orderId: newOrder.id, ...item } as any);
      }

      if (paymentMethod === 'stripe') {
        const stripeService = require('../services/stripeService').default;
        const origin = req.headers.origin || process.env.FRONTEND_URL || 'http://localhost:3000';
        // Remove locale path logic for simplicity if frontend handles locale redirect, 
        // but it's safer to just point to the root or the referer path
        const successUrl = `${origin}/order/${newOrder.id}?success=1`;
        const cancelUrl = `${origin}/checkout`;

        // Build USD line items from the just-created order items (single
        // source of truth) so Stripe always matches the order total.
        const { lineItems, stripeTotalUSD } = await buildStripeLineItems(orderItems);
        const stripeSession = await stripeService.createDirectCheckout(lineItems, successUrl, cancelUrl, undefined);

        return res.json({
          success: true,
          orderId: newOrder.id,
          orderNumber: newOrder.orderNumber,
          total: orderTotal,
          stripeTotal: stripeTotalUSD,
          stripeCurrency: 'usd',
          checkoutUrl: stripeSession.url
        });
      }

      return res.json({
        success: true,
        orderId: newOrder.id,
        orderNumber: newOrder.orderNumber,
        total: orderTotal
      });
    }

    // ── MODE 2: DB-side pending cart (legacy) ────────────────────────────────
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

    const orderTotal2 = cart.items.reduce((sum: number, item: any) => sum + (parseFloat(item.totalPrice) || 0), 0);

    const order = await cart.update({
      status: paymentMethod === 'stripe' ? 'pending' : 'confirmed',
      subtotal: orderTotal2,
      totalAmount: orderTotal2,
      shippingAddress: { name, address, city, country: country || 'Turkey', phone },
      customerNote: finalNotes
    } as any);

    if (paymentMethod === 'stripe') {
      const stripeService = require('../services/stripeService').default;
      const origin = req.headers.origin || process.env.FRONTEND_URL || 'http://localhost:3000';
      const successUrl = `${origin}/order/${order.id}?success=1`;
      const cancelUrl = `${origin}/checkout`;

      // Single source of truth: derive USD line items from the persisted
      // cart items (TRY) via the shared builder (handles discounts + TRY->USD
      // conversion) instead of ad-hoc inline logic.
      const { lineItems, stripeTotalUSD } = await buildStripeLineItems(cart.items);
      const stripeSession = await stripeService.createDirectCheckout(lineItems, successUrl, cancelUrl, undefined);

      return res.json({
        success: true,
        orderId: order.id,
        orderNumber: order.orderNumber,
        total: orderTotal2,
        stripeTotal: stripeTotalUSD,
        stripeCurrency: 'usd',
        checkoutUrl: stripeSession.url
      });
    }

    return res.json({
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      total: orderTotal2
    });
  } catch (error: any) {
    console.error('Checkout error:', error);
    return res.status(error.status || 500).json({ error: error.message });
  }
});

export default router;