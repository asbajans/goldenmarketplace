/**
 * B2B Controller
 * Handles B2B product discovery and store-to-store listing request workflow.
 */

import { Request, Response } from 'express';
import Product from '../models/Product';
import B2BRequest from '../models/B2BRequest';
import Store from '../models/Store';

export class B2BController {
  /**
   * GET /b2b/products
   * Returns all B2B-enabled products from all stores (seller & admin only).
   * Enriched with the requesting seller's current request status per product.
   */
  static async getB2BProducts(req: Request, res: Response) {
    try {
      const storeId = (req as any).user?.storeId;

      const products = await Product.findAll({
        where: { isB2BEnabled: true, isActive: true },
        include: [
          { model: Store, as: 'store', attributes: ['id', ['storeName', 'name']] }
        ],
        order: [['createdAt', 'DESC']]
      });

      // If caller has a store, attach their request status per product
      let requestMap: Record<string, string> = {};
      if (storeId) {
        const existingRequests = await B2BRequest.findAll({
          where: { requesterStoreId: storeId }
        });
        existingRequests.forEach(r => {
          requestMap[r.productId] = r.status;
        });
      }

      const result = products.map((p: any) => ({
        ...p.toJSON(),
        myRequestStatus: requestMap[p.id] || null
      }));

      return res.json(result);
    } catch (error: any) {
      console.error('[B2B] getB2BProducts error:', error);
      return res.status(500).json({ error: 'B2B ürünleri alınamadı' });
    }
  }

  /**
   * POST /b2b/requests
   * Seller requests to list a B2B product in their store.
   * Body: { productId, requestNote? }
   */
  static async createRequest(req: Request, res: Response) {
    try {
      const store = (req as any).user?.store;
      if (!store) return res.status(403).json({ error: 'Mağaza bulunamadı' });

      const { productId, requestNote } = req.body;
      if (!productId) return res.status(400).json({ error: 'productId gerekli' });

      const product = await Product.findByPk(productId, {
        include: [{ model: Store, as: 'store', attributes: ['id', ['storeName', 'name']] }]
      });
      if (!product || !product.isB2BEnabled) {
        return res.status(404).json({ error: 'B2B ürün bulunamadı' });
      }
      if ((product as any).storeId === store.id) {
        return res.status(400).json({ error: 'Kendi ürününüzü ekleyemezsiniz' });
      }

      const [request, created] = await B2BRequest.findOrCreate({
        where: { productId, requesterStoreId: store.id },
        defaults: {
          productId,
          requesterStoreId: store.id,
          ownerStoreId: (product as any).storeId,
          status: 'pending',
          requestNote
        }
      });

      if (!created) {
        return res.status(409).json({
          error: 'Bu ürün için zaten bir talep mevcut',
          status: request.status
        });
      }

      return res.status(201).json({
        message: 'Talep gönderildi. Ürün sahibinin onayı bekleniyor.',
        request
      });
    } catch (error: any) {
      console.error('[B2B] createRequest error:', error);
      return res.status(500).json({ error: 'Talep oluşturulamadı' });
    }
  }

  /**
   * GET /b2b/requests/incoming
   * Stock owner sees all requests for their products.
   */
  static async getIncomingRequests(req: Request, res: Response) {
    try {
      const store = (req as any).user?.store;
      if (!store) return res.status(403).json({ error: 'Mağaza bulunamadı' });

      const requests = await B2BRequest.findAll({
        where: { ownerStoreId: store.id },
        include: [
          {
            model: Product,
            as: 'product',
            attributes: ['id', 'title', 'priceTRY', 'b2bPrice', 'images', 'category']
          },
          {
            model: Store,
            as: 'requesterStore',
            attributes: ['id', ['storeName', 'name']]
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      return res.json(requests);
    } catch (error: any) {
      console.error('[B2B] getIncomingRequests error:', error);
      return res.status(500).json({ error: 'Gelen talepler alınamadı' });
    }
  }

  /**
   * GET /b2b/requests/outgoing
   * Requesting seller sees their own requests and statuses.
   */
  static async getOutgoingRequests(req: Request, res: Response) {
    try {
      const store = (req as any).user?.store;
      if (!store) return res.status(403).json({ error: 'Mağaza bulunamadı' });

      const requests = await B2BRequest.findAll({
        where: { requesterStoreId: store.id },
        include: [
          {
            model: Product,
            as: 'product',
            attributes: ['id', 'title', 'priceTRY', 'b2bPrice', 'b2bDiscount', 'images', 'category']
          },
          {
            model: Store,
            as: 'ownerStore',
            attributes: ['id', ['storeName', 'name']]
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      return res.json(requests);
    } catch (error: any) {
      console.error('[B2B] getOutgoingRequests error:', error);
      return res.status(500).json({ error: 'Gönderilen talepler alınamadı' });
    }
  }

  /**
   * PUT /b2b/requests/:id/approve
   * Stock owner approves a pending request.
   */
  static async approveRequest(req: Request, res: Response) {
    try {
      const store = (req as any).user?.store;
      if (!store) return res.status(403).json({ error: 'Mağaza bulunamadı' });

      const request = await B2BRequest.findOne({
        where: { id: req.params.id, ownerStoreId: store.id }
      });
      if (!request) return res.status(404).json({ error: 'Talep bulunamadı' });
      if (request.status !== 'pending') {
        return res.status(400).json({ error: `Talep zaten ${request.status} durumunda` });
      }

      await request.update({ status: 'approved' });
      return res.json({ message: 'Talep onaylandı', request });
    } catch (error: any) {
      console.error('[B2B] approveRequest error:', error);
      return res.status(500).json({ error: 'Onay işlemi başarısız' });
    }
  }

  /**
   * PUT /b2b/requests/:id/reject
   * Stock owner rejects a pending request.
   */
  static async rejectRequest(req: Request, res: Response) {
    try {
      const store = (req as any).user?.store;
      if (!store) return res.status(403).json({ error: 'Mağaza bulunamadı' });

      const request = await B2BRequest.findOne({
        where: { id: req.params.id, ownerStoreId: store.id }
      });
      if (!request) return res.status(404).json({ error: 'Talep bulunamadı' });
      if (request.status !== 'pending') {
        return res.status(400).json({ error: `Talep zaten ${request.status} durumunda` });
      }

      await request.update({ status: 'rejected' });
      return res.json({ message: 'Talep reddedildi', request });
    } catch (error: any) {
      console.error('[B2B] rejectRequest error:', error);
      return res.status(500).json({ error: 'Red işlemi başarısız' });
    }
  }
}

export default B2BController;
