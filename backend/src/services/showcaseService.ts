/**
 * Showcase (Vitrin) Service
 *
 * Sıralama sözleşmesi (ana sayfa + kategori — ikisi de getProducts'tan beslenir):
 *   1. Dopingi aktif ürünler (isDoped + dopedUntil > şimdi)
 *   2. Mağaza vitrin ağırlığı yüksek olanlar (showcaseWeight DESC, süresi dolmuş ağırlık yok sayılır)
 *   3. En yeniler (createdAt DESC)
 *
 * Doping kotası defter tutmadan çalışır: kotayı yiyen AKTİF doping sayısıdır,
 * süresi dolan kendiliğinden yer açar.
 */
import { Op, Sequelize } from 'sequelize';
import Product from '../models/Product';
import planAccessService from './planAccessService';

export interface DopingAccess {
  allowed: boolean;
  limit: number;
  used: number;
  durationDays: number;
  message: string;
}

class ShowcaseService {
  /** Süresi dolmuş doping/vitrin satırlarını gorunurlukten düşürür (idempotent). */
  async expireOutdated(): Promise<{ products: number }> {
    const [count] = await Product.update(
      { isDoped: false } as any,
      { where: { isDoped: true, dopedUntil: { [Op.lt]: new Date() } } }
    );
    return { products: count };
  }

  /** Mağazanın aktif doping sayısı + paket kotası. */
  async checkDopingAccess(userId: string, storeId: string): Promise<DopingAccess> {
    const { plan } = await planAccessService.getUserPlan(userId);
    const limit = plan?.dopingMonthlyLimit ?? 0;
    const durationDays = plan?.dopingDurationDays ?? 30;
    if (!plan || limit <= 0) {
      return {
        allowed: false, limit: 0, used: 0, durationDays,
        message: 'Paketinizde doping hakkı yok. Doping içeren bir pakete geçin.'
      };
    }
    const used = await Product.count({
      where: { storeId, isDoped: true, dopedUntil: { [Op.gt]: new Date() } }
    });
    if (used >= limit) {
      return {
        allowed: false, limit, used, durationDays,
        message: `Doping kotanız dolu (${used}/${limit}). Süresi dolanı kapatın veya paketinizi yükseltin.`
      };
    }
    return { allowed: true, limit, used, durationDays, message: '' };
  }

  /** Satıcı dopingi (kotalı). Zaten dopingliyse süre uzatılır. */
  async dopeProduct(product: any, durationDays: number, style = 'gold'): Promise<any> {
    const until = new Date(Date.now() + Math.max(1, durationDays) * 24 * 60 * 60 * 1000);
    await product.update({ isDoped: true, dopedUntil: until, dopingStyle: style || 'gold' });
    return product;
  }

  async undopeProduct(product: any): Promise<any> {
    await product.update({ isDoped: false, dopedUntil: null });
    return product;
  }

  /** Vitrin listeleme sırası (getProducts varsayılanı). */
  showcaseOrder(): any[] {
    return [
      // Dopingli-aktif önce
      [Sequelize.literal('CASE WHEN "Product"."isDoped" IS TRUE AND "Product"."dopedUntil" > NOW() THEN 0 ELSE 1 END'), 'ASC'],
      // Mağaza ağırlığı (süreli ağırlık bitince 0 sayılır)
      [Sequelize.literal('CASE WHEN "store"."showcaseUntil" IS NULL OR "store"."showcaseUntil" > NOW() THEN COALESCE("store"."showcaseWeight", 0) ELSE 0 END'), 'DESC'],
      ['createdAt', 'DESC']
    ];
  }

  /** Doping bayrağı response'a taşınır (market/ altın çerçeveyi buradan çizer). */
  isDopingActive(p: any): boolean {
    if (!p?.isDoped) return false;
    if (!p.dopedUntil) return true;
    return new Date(p.dopedUntil).getTime() > Date.now();
  }

  /** Mağazanın geçerli vitrin ağırlığı (süresi dolmuşsa 0). */
  storeWeight(p: any, now = Date.now()): number {
    const s = (p as any)?.store;
    if (!s) return 0;
    const until = (s as any).showcaseUntil ? new Date((s as any).showcaseUntil).getTime() : null;
    if (until !== null && until < now) return 0;
    return Number((s as any).showcaseWeight) || 0;
  }

  /**
   * Ana sayfa bölüm seçimi: dopingli önce (en fazla 2), sonra ağırlık-oranlı
   * adil kota — her mağaza en az 1 ürünle temsil edilir, kalan kontenjan
   * ağırlığa göre dolar. Her çağrıda karıştırılır (yenilemede ürünler değişir).
   */
  pickHomepageProducts(candidates: any[], n: number): any[] {
    const now = Date.now();
    const dopedActive = (p: any) =>
      !!(p as any).isDoped && (p as any).dopedUntil && new Date((p as any).dopedUntil).getTime() > now;
    const shuffled = [...candidates].sort(() => Math.random() - 0.5);
    const out: any[] = [];
    for (const p of shuffled) {
      if (out.length >= Math.min(2, n)) break;
      if (dopedActive(p)) out.push(p);
    }
    const pickedIds = new Set(out.map((p: any) => (p as any).id));
    const rest = shuffled.filter((p: any) => !pickedIds.has((p as any).id));

    const byStore = new Map<string, any[]>();
    for (const p of rest) {
      const key = String((p as any).storeId || 'none');
      if (!byStore.has(key)) byStore.set(key, []);
      byStore.get(key)!.push(p);
    }
    const stores = [...byStore.entries()]
      .map(([id, items]) => ({ id, items, w: this.storeWeight(items[0], now) }))
      .sort((a, b) => b.w - a.w);
    if (stores.length === 0) return out;

    const remaining = n - out.length;
    const totalW = stores.reduce((s, x) => s + x.w, 0);
    const quotaOf = (w: number): number =>
      totalW > 0 ? Math.max(1, Math.round((remaining * w) / totalW)) : 1;

    const taken = new Map<string, number>();
    let progressed = true;
    let guard = 0;
    while (out.length < n && progressed && guard++ < n * (stores.length + 1) + 10) {
      progressed = false;
      for (const st of stores) {
        if (out.length >= n) break;
        const have = taken.get(st.id) || 0;
        if (have >= quotaOf(st.w)) continue;
        const item = st.items[have];
        if (!item) continue;
        out.push(item);
        taken.set(st.id, have + 1);
        progressed = true;
      }
    }
    // Kota artığı: ağırlık sırasına göre doldur
    if (out.length < n) {
      const inOut = new Set(out.map((p: any) => (p as any).id));
      for (const st of stores) {
        for (const item of st.items) {
          if (out.length >= n) break;
          if (!(inOut.has((item as any).id))) {
            out.push(item);
            inOut.add((item as any).id);
          }
        }
      }
    }
    return out;
  }
}

export default new ShowcaseService();
