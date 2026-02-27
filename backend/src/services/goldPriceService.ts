/**
 * Gold Price Service
 * Fetches REAL gold prices from goldprice.org and exchange rates from exchangerate-api.com
 * Both APIs are free and require no API key.
 *
 * Core formula: gramWeight × (milyem/1000) × gold24KGramPriceTRY × (1 + profitMargin/100)
 */

import axios from 'axios';
import NodeCache from 'node-cache';
import dotenv from 'dotenv';

dotenv.config();

const goldCache = new NodeCache({ stdTTL: 3600 }); // Cache for 1 hour

interface GoldPrice {
  pricePerGramTRY: number;  // 24K gram price in TRY
  pricePerOzTRY: number;    // Price per troy ounce in TRY
  usdTryRate: number;       // USD/TRY exchange rate
  timestamp: Date;
  source: string;           // Which API provided the data
}

const TROY_OUNCE_IN_GRAMS = 31.1035;

export class GoldPriceService {

  /**
   * Fetch current 24K gold price per gram in TRY
   * Primary source: goldprice.org (free, no key)
   * Exchange rate: exchangerate-api.com (free, no key)
   */
  async getCurrentGoldPrice(): Promise<GoldPrice> {
    try {
      const cached = goldCache.get<GoldPrice>('gold_price');
      if (cached) return cached;

      // Fetch gold price and exchange rate in parallel
      const [goldData, usdTryRate] = await Promise.all([
        this.fetchGoldPriceFromGoldPriceOrg(),
        this.fetchUsdTryRate()
      ]);

      const result: GoldPrice = {
        pricePerGramTRY: Math.round(goldData.pricePerGramTRY * 100) / 100,
        pricePerOzTRY: Math.round(goldData.pricePerOzTRY * 100) / 100,
        usdTryRate: Math.round(usdTryRate * 100) / 100,
        timestamp: new Date(),
        source: goldData.source
      };

      goldCache.set('gold_price', result);
      console.log(`[GoldPrice] Fetched: 24K Gram = ${result.pricePerGramTRY} TRY | USD/TRY = ${result.usdTryRate} | Source: ${result.source}`);
      return result;
    } catch (error) {
      console.error('[GoldPrice] All sources failed:', error);
      // Last resort fallback - should rarely happen
      return this.getHardcodedFallback();
    }
  }

  /**
   * Primary: goldprice.org - Free, no API key, reliable
   * Returns XAU price in TRY per troy ounce
   */
  private async fetchGoldPriceFromGoldPriceOrg(): Promise<{ pricePerGramTRY: number; pricePerOzTRY: number; source: string }> {
    try {
      const response = await axios.get('https://data-asg.goldprice.org/dbXRates/TRY', {
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'GoldenMarketplace/1.0'
        }
      });

      const xauPriceTRY = response.data?.items?.[0]?.xauPrice;
      if (!xauPriceTRY || xauPriceTRY <= 0) {
        throw new Error('Invalid gold price from goldprice.org');
      }

      return {
        pricePerOzTRY: xauPriceTRY,
        pricePerGramTRY: xauPriceTRY / TROY_OUNCE_IN_GRAMS,
        source: 'goldprice.org'
      };
    } catch (error) {
      console.error('[GoldPrice] goldprice.org failed:', error);
      // Fallback: try with USD and convert
      return this.fetchGoldPriceFromGoldPriceOrgUSD();
    }
  }

  /**
   * Fallback: goldprice.org with USD, then convert using exchange rate
   */
  private async fetchGoldPriceFromGoldPriceOrgUSD(): Promise<{ pricePerGramTRY: number; pricePerOzTRY: number; source: string }> {
    try {
      const [goldResponse, usdTryRate] = await Promise.all([
        axios.get('https://data-asg.goldprice.org/dbXRates/USD', { timeout: 10000 }),
        this.fetchUsdTryRate()
      ]);

      const xauPriceUSD = goldResponse.data?.items?.[0]?.xauPrice;
      if (!xauPriceUSD || xauPriceUSD <= 0) {
        throw new Error('Invalid USD gold price');
      }

      const pricePerOzTRY = xauPriceUSD * usdTryRate;
      return {
        pricePerOzTRY,
        pricePerGramTRY: pricePerOzTRY / TROY_OUNCE_IN_GRAMS,
        source: 'goldprice.org (USD→TRY)'
      };
    } catch (error) {
      console.error('[GoldPrice] USD fallback also failed:', error);
      throw error;
    }
  }

  /**
   * Fetch USD/TRY exchange rate from exchangerate-api.com (free, no key)
   */
  private async fetchUsdTryRate(): Promise<number> {
    const cachedRate = goldCache.get<number>('usd_try_rate');
    if (cachedRate) return cachedRate;

    try {
      const response = await axios.get('https://api.exchangerate-api.com/v4/latest/USD', {
        timeout: 10000
      });

      const rate = response.data?.rates?.TRY;
      if (!rate || rate <= 0) {
        throw new Error('Invalid TRY rate');
      }

      goldCache.set('usd_try_rate', rate, 3600);
      return rate;
    } catch (error) {
      console.error('[GoldPrice] Exchange rate API failed:', error);
      // Fallback: try alternative
      try {
        const response = await axios.get('https://open.er-api.com/v6/latest/USD', { timeout: 10000 });
        const rate = response.data?.rates?.TRY;
        if (rate && rate > 0) {
          goldCache.set('usd_try_rate', rate, 3600);
          return rate;
        }
      } catch (e) {
        console.error('[GoldPrice] Fallback exchange rate also failed:', e);
      }
      throw new Error('All exchange rate sources failed');
    }
  }

  /**
   * Hard-coded fallback - used only when ALL APIs fail
   */
  private getHardcodedFallback(): GoldPrice {
    console.warn('[GoldPrice] Using hardcoded fallback! Check API connectivity.');
    return {
      pricePerGramTRY: 3100,
      pricePerOzTRY: 96421,
      usdTryRate: 36.5,
      timestamp: new Date(),
      source: 'hardcoded-fallback'
    };
  }

  /**
   * Force refresh cache (useful for manual trigger)
   */
  async forceRefresh(): Promise<GoldPrice> {
    goldCache.del('gold_price');
    goldCache.del('usd_try_rate');
    return this.getCurrentGoldPrice();
  }

  /**
   * Calculate product price from gram weight, milyem, and profit margin
   * Formula: gramWeight × (milyem / 1000) × 24K gram TRY × (1 + profitMargin/100)
   */
  async calculateProductPrice(gramWeight: number, milyem: number, profitMargin: number = 0): Promise<{ priceTRY: number; priceUSD: number }> {
    const gold = await this.getCurrentGoldPrice();
    const materialCost = gramWeight * (milyem / 1000) * gold.pricePerGramTRY;
    const priceTRY = materialCost * (1 + profitMargin / 100);
    const priceUSD = priceTRY / gold.usdTryRate;
    return {
      priceTRY: Math.round(priceTRY * 100) / 100,
      priceUSD: Math.round(priceUSD * 100) / 100
    };
  }

  /**
   * Update ALL active product prices based on current gold rate
   * Called hourly by goldPriceJob
   */
  async updateProductPrices(): Promise<{ updatedCount: number; goldPrice: GoldPrice }> {
    console.log('[GoldPrice] Starting hourly price update...');

    // Force fresh data for the hourly update
    const gold = await this.forceRefresh();
    console.log(`[GoldPrice] 24K Gram: ${gold.pricePerGramTRY} TRY | USD/TRY: ${gold.usdTryRate} | Source: ${gold.source}`);

    const Product = require('../models/Product').default;
    const products = await Product.findAll({ where: { isActive: true } });
    let updatedCount = 0;

    for (const product of products) {
      const { priceTRY, priceUSD } = await this.calculateProductPrice(
        Number(product.gramWeight),
        Number(product.milyem),
        Number(product.profitMargin || 0)
      );

      // Always update to keep prices current
      await product.update({ priceTRY, priceUSD });
      updatedCount++;
    }

    console.log(`[GoldPrice] Updated ${updatedCount} product prices.`);
    return { updatedCount, goldPrice: gold };
  }
}

export default new GoldPriceService();
