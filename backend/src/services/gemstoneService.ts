/**
 * Gemstone Service
 * Taş fiyat formülü: karat × karat fiyatı × kesim çarpanı × özellik çarpanı.
 * Çarpan eşleşmezse 1; karat fiyatı 0 ise taş teşhirdir (0 döner).
 */
import ProductStone from '../models/ProductStone';
import Gemstone from '../models/Gemstone';

export interface EnrichedStone {
  id: string;
  gemstoneId: string;
  gemstoneName: string;
  carat: number | null;
  cut: string | null;
  quality: string | null;
  quantity: number;
  isFixed: boolean;
  priceTRY: number;
  priceUSD: number;
}

function normKey(v: unknown): string {
  // Bilinçli olarak locale'siz toLowerCase: tr-TR 'I' harfini 'ı' yapar ve
  // "FG/SI" gibi anahtarlar eşleşmezdi.
  return String(v || '').trim().toLowerCase();
}

function lookupMult(map: any, key: unknown): number {
  if (!map || typeof map !== 'object') return 1;
  const k = normKey(key);
  if (!k) return 1;
  for (const [mk, mv] of Object.entries(map)) {
    if (normKey(mk) === k) {
      const n = Number(mv);
      return Number.isFinite(n) && n > 0 ? n : 1;
    }
  }
  return 1;
}

export function computeStonePriceTRY(
  carat: unknown,
  pricePerCaratUSD: unknown,
  cut: unknown,
  quality: unknown,
  cutMultipliers?: any,
  qualityMultipliers?: any,
  usdTryRate?: number
): number {
  const c = Number(carat) || 0;
  const ppc = Number(pricePerCaratUSD) || 0;
  if (c <= 0 || ppc <= 0) return 0;
  const usd = c * ppc * lookupMult(cutMultipliers, cut) * lookupMult(qualityMultipliers, quality);
  const rate = Number(usdTryRate) || 38.5;
  return Math.round(usd * rate * 100) / 100;
}

async function getUsdTryRate(): Promise<number> {
  try {
    const { default: goldPriceService } = await import('./goldPriceService');
    const gold = await goldPriceService.getCurrentGoldPrice();
    return Number(gold.usdTryRate) || 38.5;
  } catch {
    return 38.5;
  }
}

/** Ürünün taş seçenekleri (fiyatları hesaplanmış). Pasif taşlar dahil edilmez. */
export async function getProductStones(productId: string): Promise<EnrichedStone[]> {
  const rows = await ProductStone.findAll({
    where: { productId },
    include: [{ model: Gemstone, as: 'gemstone', attributes: ['id', 'name', 'pricePerCaratUSD', 'cutMultipliers', 'qualityMultipliers', 'isActive'] }],
    order: [['createdAt', 'ASC']]
  });
  const usdTryRate = await getUsdTryRate();
  const out: EnrichedStone[] = [];
  for (const r of rows as any[]) {
    const g = r.gemstone;
    if (!g || (g as any).isActive === false) continue;
    const priceTRY = computeStonePriceTRY(
      r.carat, (g as any).pricePerCaratUSD, r.cut, r.quality,
      (g as any).cutMultipliers, (g as any).qualityMultipliers, usdTryRate
    );
    out.push({
      id: r.id,
      gemstoneId: r.gemstoneId,
      gemstoneName: (g as any).name,
      carat: r.carat !== null && r.carat !== undefined ? Number(r.carat) : null,
      cut: r.cut || null,
      quality: r.quality || null,
      quantity: r.quantity || 1,
      isFixed: !!r.isFixed,
      priceTRY,
      priceUSD: Math.round((priceTRY / usdTryRate) * 100) / 100
    });
  }
  return out;
}

/** Tek taş seçeneğinin güncel fiyatı (sepet/checkout doğrulaması için). */
export async function getStonePrice(productId: string, productStoneId: string): Promise<{ priceTRY: number; priceUSD: number } | null> {
  const stones = await getProductStones(productId);
  const hit = stones.find(s => s.id === productStoneId);
  if (!hit) return null;
  return { priceTRY: hit.priceTRY, priceUSD: hit.priceUSD };
}

/** AI açıklama bağlamı: "Pırlanta 0,5ct (baget, FG/SI)" satırları. */
export function stonesSummary(stones: Array<{ gemstoneName?: string; carat?: number | null; cut?: string | null; quality?: string | null; quantity?: number }>): string {
  return (stones || [])
    .map(s => {
      const bits = [s.gemstoneName || 'Taş'];
      if (s.carat) bits.push(`${s.carat}ct`);
      if (s.cut) bits.push(String(s.cut));
      if (s.quality) bits.push(String(s.quality));
      if (s.quantity && s.quantity > 1) bits.push(`${s.quantity} adet`);
      return bits.join(' ');
    })
    .join('; ');
}

export default { computeStonePriceTRY, getProductStones, getStonePrice, stonesSummary };
