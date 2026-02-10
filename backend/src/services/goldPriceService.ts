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

  /**
   * Fetch current gold price
   */
  async getCurrentGoldPrice(): Promise<GoldPrice> {
    try {
      const cached = goldCache.get('gold_price');
      if (cached) {
        return cached as GoldPrice;
      }

      const response = await axios.get(this.apiUrl, {
        headers: {
          'x-access-token': this.apiKey
        },
        params: {
          curr: 'USD'
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
      throw new Error('Failed to fetch gold price');
    }
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
}

export default new GoldPriceService();
