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
}

export default new ShowcaseService();
