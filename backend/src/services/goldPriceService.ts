/**
 * Gold Price Service
 * Fetch and cache gold prices for currency indexing
 * Core formula: gramWeight × (milyem/1000) × gold24KGramPriceTRY
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
}

export class GoldPriceService {
  private apiUrl = process.env.GOLD_API_URL || 'https://api.goldapi.io/api/XAU';
  private apiKey = process.env.GOLD_API_KEY || '';

  /**
   * Fetch current 24K gold price per gram in TRY
   */
  async getCurrentGoldPrice(): Promise<GoldPrice> {
    try {
      const cached = goldCache.get<GoldPrice>('gold_price');
      if (cached) return cached;

      // Mock response if no API key
      if (!this.apiKey) {
        console.log('[GoldPrice] Using mock data (no API key)');
        const pricePerOzTRY = 65000 + (Math.random() * 1000 - 500);
        const pricePerGramTRY = pricePerOzTRY / 31.1035;
        const usdTryRate = 38.5;
        const result: GoldPrice = {
          pricePerGramTRY: Math.round(pricePerGramTRY * 100) / 100,
          pricePerOzTRY: Math.round(pricePerOzTRY * 100) / 100,
          usdTryRate,
          timestamp: new Date()
        };
        goldCache.set('gold_price', result);
        return result;
      }

      const response = await axios.get(this.apiUrl, {
        headers: { 'x-access-token': this.apiKey },
        params: { curr: 'TRY' }
      });

      const pricePerOzTRY = response.data.price;
      const pricePerGramTRY = pricePerOzTRY / 31.1035;

      // fetch USD/TRY from same API or mock
      const usdTryRate = response.data.usd_try || 38.5;

      const result: GoldPrice = {
        pricePerGramTRY: Math.round(pricePerGramTRY * 100) / 100,
        pricePerOzTRY: Math.round(pricePerOzTRY * 100) / 100,
        usdTryRate,
        timestamp: new Date()
      };

      goldCache.set('gold_price', result);
      return result;
    } catch (error) {
      console.error('[GoldPrice] Error fetching:', error);
      // Fallback
      return {
        pricePerGramTRY: 2090,
        pricePerOzTRY: 65000,
        usdTryRate: 38.5,
        timestamp: new Date()
      };
    }
  }

  /**
   * Calculate product price from gram weight and milyem
   * Formula: gramWeight × (milyem / 1000) × 24K gram TRY
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
    const gold = await this.getCurrentGoldPrice();
    console.log(`[GoldPrice] 24K Gram: ${gold.pricePerGramTRY} TRY | USD/TRY: ${gold.usdTryRate}`);

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
