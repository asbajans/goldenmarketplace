/**
 * Gemstone Routes (satıcı taş kataloğu — mağaza kapsamlı)
 */
import express from 'express';
import Gemstone from '../models/Gemstone';
import { authMiddleware, sellerMiddleware } from '../middleware/authMiddleware';

const router = express.Router();
router.use(authMiddleware, sellerMiddleware);

function parseMults(input: unknown): Record<string, number> {
  // Locale'siz küçültme (tr-TR "I"→"ı" yapar, servis tarafıyla eşleşmezdi)
  const low = (s: string) => s.trim().toLowerCase();
  if (!input) return {};
  if (typeof input === 'object' && !Array.isArray(input)) {
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(input as any)) {
      const n = Number(v);
      if (k && Number.isFinite(n) && n > 0) out[low(k)] = n;
    }
    return out;
  }
  // "baget=1.2" satırları
  const out: Record<string, number> = {};
  for (const line of String(input).split('\n')) {
    const [k, v] = line.split('=').map(s => (s || '').trim());
    const n = Number((v || '').replace(',', '.'));
    if (k && Number.isFinite(n) && n > 0) out[low(k)] = n;
  }
  return out;
}

router.get('/', async (req, res) => {
  try {
    const store = (req as any).store;
    const { Op } = require('sequelize');
    const stones = await Gemstone.findAll({
      // Global (admin) + kendi taşları
      where: { [Op.or]: [{ storeId: null }, { storeId: store.id }] },
      order: [['name', 'ASC']]
    });
    return res.json({ data: stones });
  } catch (err: any) {
    return res.status(500).json({ error: 'Taş listesi alınamadı' });
  }
});

router.post('/', async (req, res) => {
  try {
    const store = (req as any).store;
    const { name, pricePerCaratUSD, cutMultipliers, qualityMultipliers, isActive } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Taş adı zorunludur' });
    }
    const stone = await Gemstone.create({
      storeId: store.id,
      name: String(name).trim().substring(0, 120),
      pricePerCaratUSD: Math.max(0, Number(pricePerCaratUSD) || 0),
      cutMultipliers: parseMults(cutMultipliers),
      qualityMultipliers: parseMults(qualityMultipliers),
      isActive: isActive !== undefined ? !!isActive : true
    });
    return res.status(201).json({ data: stone });
  } catch (err: any) {
    return res.status(500).json({ error: 'Taş oluşturulamadı' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const store = (req as any).store;
    const stone = await Gemstone.findOne({ where: { id: req.params.id, storeId: store.id } });
    if (!stone) return res.status(404).json({ error: 'Taş bulunamadı (global taşlar düzenlenemez)' });
    const patch: any = {};
    if (req.body.name !== undefined) patch.name = String(req.body.name).trim().substring(0, 120);
    if (req.body.pricePerCaratUSD !== undefined) patch.pricePerCaratUSD = Math.max(0, Number(req.body.pricePerCaratUSD) || 0);
    if (req.body.cutMultipliers !== undefined) patch.cutMultipliers = parseMults(req.body.cutMultipliers);
    if (req.body.qualityMultipliers !== undefined) patch.qualityMultipliers = parseMults(req.body.qualityMultipliers);
    if (req.body.isActive !== undefined) patch.isActive = !!req.body.isActive;
    await stone.update(patch);
    return res.json({ data: stone });
  } catch (err: any) {
    return res.status(500).json({ error: 'Taş güncellenemedi' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const store = (req as any).store;
    const stone = await Gemstone.findOne({ where: { id: req.params.id, storeId: store.id } });
    if (!stone) return res.status(404).json({ error: 'Taş bulunamadı' });
    const { default: ProductStone } = await import('../models/ProductStone');
    await ProductStone.destroy({ where: { gemstoneId: stone.id } });
    await stone.destroy();
    return res.json({ message: 'Taş silindi (ürün seçenekleri de kalktı)' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Taş silinemedi' });
  }
});

export default router;
