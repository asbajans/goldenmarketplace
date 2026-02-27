/**
 * Gold Price Service
 * Fetch and cache gold prices for currency indexing
 */

import axios from 'axios';
import NodeCache from 'node-cache';
import dotenv from 'dotenv';

dotenv.config();

const goldCache = new NodeCache({ stdTTL: 3600 }); // Cache for 1 hour

interface GoldPrice {
  price: number;
  currency: string;
  timestamp: Date;
  change24h: number;
}

export class GoldPriceService {
  private apiUrl = process.env.GOLD_API_URL || 'https://api.goldapi.io/api/XAU';
  private apiKey = process.env.GOLD_API_KEY || '';
  private usdToTryCache = new NodeCache({ stdTTL: 3600 });

  /**
   * Fetch current gold price
   */
  async getCurrentGoldPrice(): Promise<GoldPrice> {
    try {
      // Mock response if no API key
      if (!this.apiKey) {
        console.log('Using Mock Gold Price');
        return {
          price: 65000 + (Math.random() * 1000 - 500), // Random fluctuation around 65000 TRY/oz
          currency: 'TRY',
          timestamp: new Date(),
          change24h: 0.5
        };
      }

      const cached = goldCache.get('gold_price');
      if (cached) {
        return cached as GoldPrice;
      }

      const response = await axios.get(this.apiUrl, {
        headers: {
          'x-access-token': this.apiKey
        },
        params: {
          curr: 'TRY'
        }
      });

      const goldPrice: GoldPrice = {
        price: response.data.price,
        currency: response.data.currency,
        timestamp: new Date(),
        change24h: response.data.pct_change_1d
      };

      goldCache.set('gold_price', goldPrice);
      return goldPrice;
    } catch (error) {
      console.error('Error fetching gold price:', error);
      // Fallback to mock on error to keep system running
      return {
        price: 65000,
        currency: 'TRY',
        timestamp: new Date(),
        change24h: 0
      };
    }
  }

  /**
   * Get USD to TRY exchange rate
   */
  async getUSDExchangeRate(): Promise<number> {
    const cached = this.usdToTryCache.get('usd_try');
    if (cached) return cached as number;

    try {
      // In a real app, use a currency API. For now, mock it.
      const rate = 31.5 + (Math.random() * 0.2 - 0.1);
      this.usdToTryCache.set('usd_try', rate);
      return rate;
    } catch (error) {
      return 31.5;
    }
  }

  /**
   * Convert gram to ounces (1 oz = 31.1035g)
   */
  convertGramToOunces(grams: number): number {
    return grams / 31.1035;
  }

  /**
   * Convert amount to gold ounces
   */
  async amountToGoldOunces(amount: number): Promise<number> {
    const goldPrice = await this.getCurrentGoldPrice();
    return amount / goldPrice.price;
  }

  /**
   * Convert gold ounces to amount
   */
  async goldOuncesToAmount(ounces: number): Promise<number> {
    const goldPrice = await this.getCurrentGoldPrice();
    return ounces * goldPrice.price;
  }

  /**
   * Get price with gold indexing applied
   */
  async getPriceWithGoldIndexing(basePrice: number, goldIndexPercentage: number = 100): Promise<number> {
    const goldPrice = await this.getCurrentGoldPrice();
    const indexedAmount = (basePrice * goldIndexPercentage) / 100;
    return Math.round((indexedAmount / goldPrice.price) * 10000) / 10000; // Gold ounces
  }

  /**
   * Update all product prices based on current gold rate
   */
  async updateProductPrices(): Promise<void> {
    console.log('Starting Gold Price Update Job...');
    const goldPrice = await this.getCurrentGoldPrice();
    console.log(`Current Gold Price: ${goldPrice.price} ${goldPrice.currency}`);

    // We need to import Product inside the method or file. 
    // Importing at top level might cause circular dependency if Product uses this service.
    // But typically Models don't depend on Services. Services depend on Models.
    // Let's import at top level.
    const Product = require('../models/Product').default;

    const products = await Product.findAll({ where: { isActive: true } });
    let updatedCount = 0;

    for (const product of products) {
      if (product.goldIndexPrice && product.goldIndexPrice > 0) {
        const newBasePrice = Math.round(product.goldIndexPrice * goldPrice.price);

        // Only update if difference is significant (e.g. > 1 TL) to avoid noise?
        // Or just update always.
        if (Math.abs(newBasePrice - product.basePrice) > 1) {
          await product.update({ basePrice: newBasePrice });
          updatedCount++;
        }
      }
    }
    console.log(`Updated prices for ${updatedCount} products.`);
  }
}

export default new GoldPriceService();
