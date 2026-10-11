/**
 * Return Controller
 * Customer: open/list/track/cancel/ship return requests (own orders only).
 * Seller: list own store's requests, approve/reject, inspect, refund.
 *
 * Sorumluluk politikadaki gibidir: onay/süre/iade satıcıdadır; platform
 * denetler. Süre pencereleri: cayma = teslimden 14 gün, ayıplı = 30 gün.
 */
import { Request, Response } from 'express';
import { Op } from 'sequelize';
import Order, { OrderItem } from '../models/Order';
import Product from '../models/Product';
import ReturnRequest from '../models/ReturnRequest';

const REASONS = ['withdrawal', 'defective', 'wrong', 'incomplete', 'other'] as const;
const WINDOW_DAYS: Record<string, number> = {
  withdrawal: 14,
  defective: 30,
  wrong: 30,
  incomplete: 30,
  other: 14
};

function windowOk(order: any, reason: string): boolean {
  if (!order.deliveredDate) return false;
  const days = (Date.now() - new Date(order.deliveredDate).getTime()) / (24 * 60 * 60 * 1000);
  return days <= (WINDOW_DAYS[reason] ?? 14);
}

const CUSTOMER_INCLUDE = [
  {
    model: Order,
    as: 'order',
    attributes: ['id', 'orderNumber', 'status', 'totalAmount', 'deliveredDate']
  },
  {
    model: Product,
    as: 'product',
    attributes: ['id', 'title', 'slug', 'sku', 'images', 'priceTRY']
  }
];

export class ReturnController {
  /**
   * POST /api/returns — müşteri iade talebi açar.
   * Body: { orderId, orderItemId?, reason, customerNote? }
   */
  static async create(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { orderId, orderItemId, reason, customerNote } = req.body;
      if (!REASONS.includes(reason)) {
        return res.status(400).json({ error: 'Geçersiz iade nedeni.' });
      }
      const order = await Order.findOne({
        where: { id: orderId, customerId: userId },
        include: [{ model: OrderItem, as: 'items' }]
      });
      if (!order) return res.status(404).json({ error: 'Sipariş bulunamadı.' });
      if (!['delivered'].includes(order.status)) {
        return res.status(400).json({ error: 'İade yalnızca teslim edilmiş siparişlerde açılır.' });
      }
      if (!windowOk(order, reason)) {
        return res.status(400).json({ error: `Bu neden için iade süresi dolmuş (teslimden ${WINDOW_DAYS[reason]} gün).` });
      }

      let productId: string | null = null;
      let quantity = 1;
      let amount = Number(order.totalAmount) || 0;
      if (orderItemId) {
        const item = ((order as any).items || []).find((i: any) => i.id === orderItemId);
        if (!item) return res.status(404).json({ error: 'Sipariş kalemi bulunamadı.' });
        productId = item.productId;
        quantity = item.quantity;
        amount = Number(item.totalPrice) || 0;
      } else {
        const items = (order as any).items || [];
        if (items.length === 1) {
          productId = items[0].productId;
          quantity = items[0].quantity;
        } else if (items.length > 1) {
          return res.status(400).json({ error: 'Çok kalemli siparişlerde kalem seçin (orderItemId).' });
        } else {
          return res.status(400).json({ error: 'Siparişte iade edilecek kalem yok.' });
        }
      }

      const dup = await ReturnRequest.findOne({
        where: {
          orderId,
          orderItemId: orderItemId || null,
          customerId: userId,
          status: { [Op.notIn]: ['rejected', 'cancelled'] }
        }
      });
      if (dup) return res.status(409).json({ error: 'Bu kalem için zaten açık bir iade talebi var.' });

      const request = await ReturnRequest.create({
        orderId,
        orderItemId: orderItemId || null,
        productId: productId as string,
        storeId: order.storeId,
        customerId: userId,
        sellerId: order.sellerId,
        reason,
        customerNote: customerNote ? String(customerNote).substring(0, 2000) : null,
        quantity,
        refundAmount: amount,
        status: 'pending'
      });
      return res.status(201).json({ message: 'İade talebiniz satıcıya iletildi.', request });
    } catch (error: any) {
      console.error('Return Error [create]:', error);
      return res.status(500).json({ error: 'İade talebi açılamadı.' });
    }
  }

  /**
   * GET /api/returns — müşterinin iadeleri.
   */
  static async myList(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
      const where: any = { customerId: userId };
      if (req.query.orderId) where.orderId = req.query.orderId;
      const { count, rows } = await ReturnRequest.findAndCountAll({
        where,
        include: CUSTOMER_INCLUDE,
        order: [['createdAt', 'DESC']],
        limit,
        offset: (page - 1) * limit
      });
      return res.json({ data: rows, pagination: { page, limit, total: count, pages: Math.ceil(count / limit) } });
    } catch (error) {
      console.error('Return Error [myList]:', error);
      return res.status(500).json({ error: 'İadeler alınamadı.' });
    }
  }

  /**
   * GET /api/returns/:id — müşteri tekil takip.
   */
  static async myGet(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const request = await ReturnRequest.findOne({
        where: { id: req.params.id, customerId: userId },
        include: CUSTOMER_INCLUDE
      });
      if (!request) return res.status(404).json({ error: 'İade bulunamadı.' });
      return res.json(request);
    } catch (error) {
      return res.status(500).json({ error: 'İade alınamadı.' });
    }
  }

  /**
   * POST /api/returns/:id/ship — müşteri ürünü gönderdi (takip no).
   */
  static async ship(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { trackingNumber } = req.body;
      const request = await ReturnRequest.findOne({ where: { id: req.params.id, customerId: userId } });
      if (!request) return res.status(404).json({ error: 'İade bulunamadı.' });
      if (request.status !== 'approved') {
        return res.status(400).json({ error: 'Ürün yalnızca satıcı onayından sonra gönderilir.' });
      }
      await request.update({ status: 'shipped', trackingNumber: trackingNumber ? String(trackingNumber).substring(0, 120) : null });
      return res.json({ message: 'Kargo bilgisi satıcıya iletildi.', request });
    } catch (error) {
      return res.status(500).json({ error: 'İşlem başarısız.' });
    }
  }

  /**
   * POST /api/returns/:id/cancel — müşteri bekleyen talebi iptal eder.
   */
  static async cancel(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const request = await ReturnRequest.findOne({ where: { id: req.params.id, customerId: userId } });
      if (!request) return res.status(404).json({ error: 'İade bulunamadı.' });
      if (request.status !== 'pending') {
        return res.status(400).json({ error: 'Yalnızca bekleyen talep iptal edilir.' });
      }
      await request.update({ status: 'cancelled' });
      return res.json({ message: 'İade talebi iptal edildi.', request });
    } catch (error) {
      return res.status(500).json({ error: 'İşlem başarısız.' });
    }
  }

  /**
   * GET /api/returns/seller — satıcının mağazasına gelen iadeler.
   */
  static async sellerList(req: Request, res: Response) {
    try {
      const store = (req as any).store;
      if (!store) return res.status(400).json({ error: 'Mağaza bulunamadı.' });
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const where: any = { storeId: store.id };
      if (req.query.status) where.status = req.query.status;
      const { count, rows } = await ReturnRequest.findAndCountAll({
        where,
        include: [
          { model: Order, as: 'order', attributes: ['id', 'orderNumber', 'status', 'totalAmount', 'deliveredDate'] },
          { model: Product, as: 'product', attributes: ['id', 'title', 'slug', 'sku', 'images', 'priceTRY'] }
        ],
        order: [['createdAt', 'DESC']],
        limit,
        offset: (page - 1) * limit
      });
      return res.json({ data: rows, pagination: { page, limit, total: count, pages: Math.ceil(count / limit) } });
    } catch (error) {
      console.error('Return Error [sellerList]:', error);
      return res.status(500).json({ error: 'İadeler alınamadı.' });
    }
  }

  /**
   * POST /api/returns/:id/respond — satıcı onayla/reddet (3 iş günü kuralı panelde izlenir).
   * Body: { approve: boolean, returnAddress? (onayda zorunlu), sellerNote? }
   */
  static async respond(req: Request, res: Response) {
    try {
      const store = (req as any).store;
      const { approve, returnAddress, sellerNote } = req.body;
      const request = await ReturnRequest.findOne({ where: { id: req.params.id, storeId: store.id } });
      if (!request) return res.status(404).json({ error: 'İade bulunamadı.' });
      if (request.status !== 'pending') {
        return res.status(400).json({ error: 'Yalnızca bekleyen talep yanıtlanır.' });
      }
      if (approve && !returnAddress) {
        return res.status(400).json({ error: 'Onay için iade adresi zorunludur.' });
      }
      await request.update({
        status: approve ? 'approved' : 'rejected',
        returnAddress: approve ? String(returnAddress).substring(0, 2000) : null,
        sellerNote: sellerNote ? String(sellerNote).substring(0, 2000) : null,
        decidedAt: new Date()
      });
      return res.json({ message: approve ? 'İade onaylandı.' : 'İade reddedildi.', request });
    } catch (error) {
      return res.status(500).json({ error: 'İşlem başarısız.' });
    }
  }

  /**
   * POST /api/returns/:id/inspect — satıcı ürünü inceledi (kabul/ret).
   * Body: { accepted: boolean, sellerNote? } (ret → rejected)
   */
  static async inspect(req: Request, res: Response) {
    try {
      const store = (req as any).store;
      const { accepted, sellerNote } = req.body;
      const request = await ReturnRequest.findOne({ where: { id: req.params.id, storeId: store.id } });
      if (!request) return res.status(404).json({ error: 'İade bulunamadı.' });
      if (request.status !== 'shipped') {
        return res.status(400).json({ error: 'Yalnızca kargodaki iade incelenir.' });
      }
      await request.update({
        status: accepted ? 'inspected' : 'rejected',
        sellerNote: sellerNote ? String(sellerNote).substring(0, 2000) : (request as any).sellerNote
      });
      return res.json({ message: accepted ? 'Ürün kabul edildi, iade ödemesi bekleniyor.' : 'Ürün reddedildi.', request });
    } catch (error) {
      return res.status(500).json({ error: 'İşlem başarısız.' });
    }
  }

  /**
   * POST /api/returns/:id/refund — satıcı ücret iadesini işledi.
   * Body: { refundAmount? } (boşsa talepteki tutar)
   */
  static async refund(req: Request, res: Response) {
    try {
      const store = (req as any).store;
      const request = await ReturnRequest.findOne({ where: { id: req.params.id, storeId: store.id } });
      if (!request) return res.status(404).json({ error: 'İade bulunamadı.' });
      if (request.status !== 'inspected') {
        return res.status(400).json({ error: 'Önce ürün incelenmeli (inspected).' });
      }
      const amount = req.body.refundAmount !== undefined
        ? Math.max(0, Number(req.body.refundAmount) || 0)
        : Number((request as any).refundAmount) || 0;
      await request.update({ status: 'refunded', refundAmount: amount, refundedAt: new Date() });
      // Tüm-sipariş iadesinde siparişi kapat
      if (!(request as any).orderItemId) {
        await Order.update({ status: 'returned' }, { where: { id: (request as any).orderId } });
      }
      return res.json({ message: 'Ücret iadesi işlendi.', request });
    } catch (error) {
      return res.status(500).json({ error: 'İşlem başarısız.' });
    }
  }
}

export default ReturnController;
