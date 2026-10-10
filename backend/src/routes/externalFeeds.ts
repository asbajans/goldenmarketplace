/**
 * External Feed Routes
 */
import express from 'express';
import ExternalFeed from '../models/ExternalFeed';
import FeedSyncLog from '../models/FeedSyncLog';
import feedService from '../services/feedService';
import planAccessService from '../services/planAccessService';
import { triggerFeedSync } from '../jobs/feedSyncJob';
import { authMiddleware, sellerMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

// All routes require auth + seller
router.use(authMiddleware, sellerMiddleware);

/**
 * GET /api/feeds — list all feeds for the current seller's store
 */
router.get('/', async (req, res) => {
  try {
    const store = (req as any).store;
    const feeds = await ExternalFeed.findAll({
      where: { storeId: store.id },
      order: [['createdAt', 'DESC']]
    });
    return res.json({ data: feeds });
  } catch (err: any) {
    console.error('[Feeds] Get list error:', err);
    return res.status(500).json({ error: 'Feed listesi alınamadı' });
  }
});

/**
 * POST /api/feeds — create a new feed
 */
router.post('/', async (req, res) => {
  try {
    const store = (req as any).store;
    const userId = (req as any).user?.id;
    // Paket kapısı: harici feed adedi
    const feedCheck = await planAccessService.checkExternalFeedLimit(userId, store.id);
    if (!feedCheck.allowed) {
      return res.status(403).json({ error: feedCheck.message });
    }
    const feedData = {
      storeId: store.id,
      ...req.body
    };
    const feed = await ExternalFeed.create(feedData);
    return res.status(201).json({ data: feed, message: 'Feed başarıyla oluşturuldu' });
  } catch (err: any) {
    console.error('[Feeds] Create error:', err);
    return res.status(500).json({ error: 'Feed oluşturulamadı' });
  }
});

/**
 * GET /api/feeds/:id — get feed details
 */
router.get('/:id', async (req, res) => {
  try {
    const store = (req as any).store;
    const feed = await ExternalFeed.findOne({
      where: { id: req.params.id, storeId: store.id }
    });
    if (!feed) return res.status(404).json({ error: 'Feed bulunamadı' });
    return res.json({ data: feed });
  } catch (err: any) {
    return res.status(500).json({ error: 'Feed alınamadı' });
  }
});

/**
 * PUT /api/feeds/:id — update feed settings
 */
router.put('/:id', async (req, res) => {
  try {
    const store = (req as any).store;
    const feed = await ExternalFeed.findOne({
      where: { id: req.params.id, storeId: store.id }
    });
    if (!feed) return res.status(404).json({ error: 'Feed bulunamadı' });

    await feed.update(req.body);
    return res.json({ data: feed, message: 'Feed güncellendi' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Feed güncellenemedi' });
  }
});

/**
 * DELETE /api/feeds/:id — delete a feed (does NOT delete imported products)
 */
router.delete('/:id', async (req, res) => {
  try {
    const store = (req as any).store;
    const feed = await ExternalFeed.findOne({
      where: { id: req.params.id, storeId: store.id }
    });
    if (!feed) return res.status(404).json({ error: 'Feed bulunamadı' });

    // Remove feedSourceId from products but keep them
    await feed.update({ isActive: false });
    return res.json({ message: 'Feed pasife alındı. Ürünler silinmedi.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Feed silinemedi' });
  }
});

/**
 * POST /api/feeds/:id/test — test fetch and parse, return sample data
 */
router.post('/:id/test', async (req, res) => {
  try {
    const store = (req as any).store;
    const feed = await ExternalFeed.findOne({
      where: { id: req.params.id, storeId: store.id }
    });
    if (!feed) return res.status(404).json({ error: 'Feed bulunamadı' });

    const result = await feedService.testFeed(feed);
    return res.json({ success: true, ...result });
  } catch (err: any) {
    return res.status(500).json({ error: 'Feed test edilemedi: ' + err.message });
  }
});

/**
 * POST /api/feeds/:id/preview — preview mapping on sample data
 */
router.post('/:id/preview', async (req, res) => {
  try {
    const store = (req as any).store;
    const feed = await ExternalFeed.findOne({
      where: { id: req.params.id, storeId: store.id }
    });
    if (!feed) return res.status(404).json({ error: 'Feed bulunamadı' });

    // Allow passing temporary mapping in request body for preview
    if (req.body.fieldMapping) {
      await feed.update({ fieldMapping: req.body.fieldMapping });
    }

    const preview = await feedService.previewMapping(feed);
    return res.json({ success: true, data: preview });
  } catch (err: any) {
    return res.status(500).json({ error: 'Önizleme alınamadı: ' + err.message });
  }
});

/**
 * POST /api/feeds/:id/sync — trigger manual sync
 */
router.post('/:id/sync', async (req, res) => {
  try {
    const store = (req as any).store;
    const feed = await ExternalFeed.findOne({
      where: { id: req.params.id, storeId: store.id }
    });
    if (!feed) return res.status(404).json({ error: 'Feed bulunamadı' });
    if (!feed.isActive) return res.status(400).json({ error: 'Feed aktif değil' });

    // Trigger async sync
    await triggerFeedSync(feed.id);

    // Start sync immediately (not via queue, for immediate feedback)
    feedService.syncFeed(feed.id).catch(err => {
      console.error(`[Feeds] Background sync error for ${feed.id}:`, err);
    });

    return res.json({ message: 'Senkronizasyon başlatıldı. Bu işlem arka planda çalışmaktadır.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Senkronizasyon başlatılamadı: ' + err.message });
  }
});

/**
 * POST /api/feeds/:id/translate-approve — sync sonu bekleyen AI çevirisini onayla ve başlat
 */
router.post('/:id/translate-approve', async (req, res) => {
  try {
    const store = (req as any).store;
    const userId = (req as any).user?.id;
    const feed = await ExternalFeed.findOne({
      where: { id: req.params.id, storeId: store.id }
    });
    if (!feed) return res.status(404).json({ error: 'Feed bulunamadı' });

    const approval = (feed.lastSyncResult as any)?.translationApproval;
    if (!approval?.required || approval.approved) {
      return res.status(400).json({ error: 'Onay bekleyen çeviri yok' });
    }

    const Product = require('../models/Product').default;
    const existing = await Product.findAll({
      where: { id: approval.productIds || [], storeId: store.id },
      attributes: ['id', 'description']
    });
    if (existing.length === 0) {
      await feed.update({
        lastSyncResult: { ...(feed.lastSyncResult as any), translationApproval: { ...approval, approved: true, approvedAt: new Date().toISOString(), queued: 0 } }
      });
      return res.status(400).json({ error: 'Çevrilecek ürün kalmamış (silinmiş olabilir)' });
    }

    // Krediyi güncel veriyle yeniden hesapla (onay anındaki gerçek maliyet)
    let estimatedCredits = 0;
    for (const p of existing) {
      const desc = String((p as any).description || '');
      estimatedCredits += (!desc || desc.length < 50) ? 2 : 1;
    }
    const access = await planAccessService.checkAIAccess(userId, estimatedCredits);
    if (!access.allowed) {
      return res.status(403).json({
        error: access.message,
        estimatedCredits,
        monthlyRemaining: (access as any).monthlyRemaining ?? 0,
        balanceRemaining: (access as any).balanceRemaining ?? 0
      });
    }

    const { queueBatchAITranslation } = require('../jobs/aiTranslationJob');
    await queueBatchAITranslation(existing.map((p: any) => p.id), userId, 'both');
    await feed.update({
      lastSyncResult: { ...(feed.lastSyncResult as any), translationApproval: { ...approval, approved: true, approvedAt: new Date().toISOString(), queued: existing.length } }
    });
    return res.json({ message: `${existing.length} ürün AI çevirisine alındı`, queued: existing.length, estimatedCredits });
  } catch (err: any) {
    console.error('[Feeds] Approve translation error:', err);
    return res.status(500).json({ error: 'Çeviri başlatılamadı: ' + err.message });
  }
});

/**
 * POST /api/feeds/:id/translate-dismiss — bekleyen çeviri onayını iptal et (kuyruğa almadan kapat)
 */
router.post('/:id/translate-dismiss', async (req, res) => {
  try {
    const store = (req as any).store;
    const feed = await ExternalFeed.findOne({
      where: { id: req.params.id, storeId: store.id }
    });
    if (!feed) return res.status(404).json({ error: 'Feed bulunamadı' });

    const approval = (feed.lastSyncResult as any)?.translationApproval;
    if (!approval?.required || approval.approved) {
      return res.status(400).json({ error: 'Onay bekleyen çeviri yok' });
    }
    await feed.update({
      lastSyncResult: { ...(feed.lastSyncResult as any), translationApproval: { ...approval, approved: true, dismissed: true, approvedAt: new Date().toISOString(), queued: 0 } }
    });
    return res.json({ message: 'Çeviri onayı kapatıldı' });
  } catch (err: any) {
    return res.status(500).json({ error: 'İşlem başarısız: ' + err.message });
  }
});

/**
 * GET /api/feeds/:id/logs — sync history for a feed
 */
router.get('/:id/logs', async (req, res) => {
  try {
    const store = (req as any).store;
    const feed = await ExternalFeed.findOne({
      where: { id: req.params.id, storeId: store.id }
    });
    if (!feed) return res.status(404).json({ error: 'Feed bulunamadı' });

    const logs = await FeedSyncLog.findAll({
      where: { feedId: feed.id },
      order: [['createdAt', 'DESC']],
      limit: 50
    });
    return res.json({ data: logs });
  } catch (err: any) {
    return res.status(500).json({ error: 'Loglar alınamadı' });
  }
});

export default router;
