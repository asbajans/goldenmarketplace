/**
 * Gold Price Service
 *
 * Manual Mode: Admin sets the gold price (24K TRY/gram) via admin panel.
 * It is stored in GlobalSettings with key "gold_price_try_per_gram".
 * When the price changes, all product prices are recalculated and
 * marketplace sync is triggered automatically.
 *
 * Core formula: gramWeight × (milyem/1000) × gold24KGramPriceTRY × (1 + profitMargin/100)
 */

import NodeCache from 'node-cache';

const goldCache = new NodeCache({ stdTTL: 3600 });

interface GoldPrice {
  pricePerGramTRY: number;
  usdTryRate: number;
  timestamp: Date;
  source: string;
}

export class GoldPriceService {

  /**
   * Get current 24K gold price per gram in TRY from GlobalSettings.
   * Returns fallback if not set.
   */
  async getCurrentGoldPrice(): Promise<GoldPrice> {
    const cached = goldCache.get<GoldPrice>('gold_price');
    if (cached) return cached;

    return this.loadFromDB();
  }

  /**
   * Load price from GlobalSettings DB
   */
  private async loadFromDB(): Promise<GoldPrice> {
    try {
      const { GlobalSetting } = require('../models/GlobalSetting');
      const [goldSetting, usdSetting] = await Promise.all([
        GlobalSetting.findOne({ where: { key: 'gold_price_try_per_gram' } }),
        GlobalSetting.findOne({ where: { key: 'usd_try_rate' } })
      ]);
      const price = goldSetting?.value ? parseFloat(goldSetting.value) : 0;
      const usdTryRate = usdSetting?.value ? parseFloat(usdSetting.value) : 38.5;

      if (!price || price <= 0) {
        console.warn('[GoldPrice] No manual price set in admin panel. Using fallback 3100 TRY/gram.');
        return this.getFallback();
      }

      const result: GoldPrice = {
        pricePerGramTRY: price,
        usdTryRate,
        timestamp: new Date(),
        source: 'manual-admin'
      };

      goldCache.set('gold_price', result, 60 * 60 * 24);
      console.log(`[GoldPrice] Loaded manual price: ${price} TRY/gram | USD/TRY: ${usdTryRate}`);
      return result;
    } catch (error) {
      console.error('[GoldPrice] Failed to load from DB:', error);
      return this.getFallback();
    }
  }

  private getFallback(): GoldPrice {
    return { pricePerGramTRY: 3100, usdTryRate: 38.5, timestamp: new Date(), source: 'hardcoded-fallback' };
  }

  /**
   * Called when admin sets a new gold price.
   * Clears cache and re-calculates all product prices, then triggers marketplace sync.
   */
  async setManualGoldPrice(priceTRYPerGram: number, usdTryRate?: number): Promise<{ updatedCount: number; goldPrice: GoldPrice }> {
    if (!priceTRYPerGram || priceTRYPerGram <= 0) {
      throw new Error('Geçersiz altın fiyatı. Pozitif bir sayı girin.');
    }

    const { GlobalSetting } = require('../models/GlobalSetting');

    // Save gold price
    const existing = await GlobalSetting.findOne({ where: { key: 'gold_price_try_per_gram' } });
    if (existing) {
      await existing.update({ value: String(priceTRYPerGram) });
    } else {
      await GlobalSetting.create({ key: 'gold_price_try_per_gram', value: String(priceTRYPerGram), isPublic: true });
    }

    // Save USD/TRY rate if provided
    if (usdTryRate && usdTryRate > 0) {
      const existingUsd = await GlobalSetting.findOne({ where: { key: 'usd_try_rate' } });
      if (existingUsd) {
        await existingUsd.update({ value: String(usdTryRate) });
      } else {
        await GlobalSetting.create({ key: 'usd_try_rate', value: String(usdTryRate), isPublic: true });
      }
    }

    // 2. Clear cache to force fresh load
    goldCache.del('gold_price');
    const gold = await this.loadFromDB();

    // 3. Recalculate all product prices
    const updatedCount = await this.updateProductPricesInternal(gold);
    console.log(`[GoldPrice] Manual price set to ${priceTRYPerGram} TRY/gram. Updated ${updatedCount} products.`);

    // 4. Trigger marketplace sync in background (don't await to respond fast)
    this.triggerMarketplaceSync();

    return { updatedCount, goldPrice: gold };
  }

  /**
   * Trigger marketplace price sync in background
   */
  private triggerMarketplaceSync() {
    try {
      const marketplacePriceSyncService = require('./marketplacePriceSyncService').default;
      marketplacePriceSyncService.syncAll()
        .then((result: any) => console.log(`[GoldPrice] Marketplace sync done. Synced: ${result.synced}, Failed: ${result.failed}`, result.errors?.length ? result.errors : ''))
        .catch((err: any) => console.error('[GoldPrice] Marketplace sync error:', err.message));
    } catch (err: any) {
      console.error('[GoldPrice] Could not trigger marketplace sync:', err.message);
    }
  }

  /**
   * Internal: update all product prices based on a given gold price
   */
  private async updateProductPricesInternal(gold: GoldPrice): Promise<number> {
    const Product = require('../models/Product').default;
    const products = await Product.findAll({ where: { isActive: true } });
    let updatedCount = 0;

    const nonClones = products.filter((p: any) => !p.originalProductId);
    const clones = products.filter((p: any) => !!p.originalProductId);

    // Update original products first
    for (const product of nonClones) {
      const { priceTRY } = this.calculatePrice(
        Number(product.gramWeight),
        Number(product.milyem),
        Number(product.profitMargin || 0),
        gold.pricePerGramTRY
      );
      const b2bPrice = product.isB2BEnabled ? Math.round(priceTRY * (1 - (product.b2bDiscount || 0) / 100) * 100) / 100 : 0;
      const priceUSD = Math.round((priceTRY / gold.usdTryRate) * 100) / 100;
      await product.update({ priceTRY, b2bPrice, priceUSD });
      updatedCount++;
    }

    // Now update clones using the new B2B prices of their parents
    for (const clone of clones) {
      const parent = nonClones.find((p: any) => p.id === clone.originalProductId);
      if (parent && parent.b2bPrice > 0) {
        const priceTRY = Math.round(parent.b2bPrice * (1 + (clone.profitMargin || 0) / 100) * 100) / 100;
        const priceUSD = Math.round((priceTRY / gold.usdTryRate) * 100) / 100;
        await clone.update({ priceTRY, priceUSD });
        updatedCount++;
      } else if (parent && parent.priceTRY > 0) {
        // Fallback if parent has no b2bPrice (e.g. b2b disabled later)
        const priceTRY = Math.round(parent.priceTRY * (1 + (clone.profitMargin || 0) / 100) * 100) / 100;
        const priceUSD = Math.round((priceTRY / gold.usdTryRate) * 100) / 100;
        await clone.update({ priceTRY, priceUSD });
        updatedCount++;
      }
    }

    return updatedCount;
  }

  /**
   * Calculate product price from gram weight, milyem, and profit margin
   */
  calculatePrice(gramWeight: number, milyem: number, profitMargin: number = 0, goldPricePerGram: number): { priceTRY: number } {
    const materialCost = gramWeight * (milyem / 1000) * goldPricePerGram;
    const priceTRY = materialCost * (1 + profitMargin / 100);
    return { priceTRY: Math.round(priceTRY * 100) / 100 };
  }

  /**
   * Calculate product price using current gold price from DB
   */
  async calculateProductPrice(gramWeight: number, milyem: number, profitMargin: number = 0): Promise<{ priceTRY: number; priceUSD: number }> {
    const gold = await this.getCurrentGoldPrice();
    const { priceTRY } = this.calculatePrice(gramWeight, milyem, profitMargin, gold.pricePerGramTRY);
    return { priceTRY, priceUSD: Math.round((priceTRY / gold.usdTryRate) * 100) / 100 };
  }

  /**
   * @deprecated Not needed in manual mode. Kept for backwards compatibility.
   */
  async updateProductPrices(): Promise<{ updatedCount: number; goldPrice: GoldPrice }> {
    const gold = await this.getCurrentGoldPrice();
    const updatedCount = await this.updateProductPricesInternal(gold);
    return { updatedCount, goldPrice: gold };
  }

  /**
   * @deprecated Not needed in manual mode - no cache to bust from API.
   */
  async forceRefresh(): Promise<GoldPrice> {
    goldCache.del('gold_price');
    return this.loadFromDB();
  }
}

export default new GoldPriceService();
