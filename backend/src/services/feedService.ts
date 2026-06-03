import axios from 'axios';
import * as xlsx from 'xlsx';
import { parseStringPromise } from 'xml2js';
import ExternalFeed from '../models/ExternalFeed';
import FeedSyncLog from '../models/FeedSyncLog';
import Product from '../models/Product';
import goldPriceService from './goldPriceService';

interface MappedProduct {
  title: string;
  sku: string;
  description?: string;
  category?: string;
  priceTRY?: number;
  priceUSD?: number;
  quantity?: number;
  images?: string[];
  isActive?: boolean;
  gramWeight?: number;
  milyem?: number;
  profitMargin?: number;
  priceMultiplier?: number;
  isB2BEnabled?: boolean;
  [key: string]: any;
}

interface SyncResult {
  total: number;
  added: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: string[];
}

class FeedService {

  /**
   * Fetch raw data from external feed URL, with auth support
   */
  async fetchFeed(feed: ExternalFeed): Promise<Buffer> {
    const config: any = {
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: {}
    };

    switch (feed.authType) {
      case 'basic':
        if (feed.authCredentials?.username && feed.authCredentials?.password) {
          const encoded = Buffer.from(`${feed.authCredentials.username}:${feed.authCredentials.password}`).toString('base64');
          config.headers['Authorization'] = `Basic ${encoded}`;
        }
        break;
      case 'bearer':
        if (feed.authCredentials?.token) {
          config.headers['Authorization'] = `Bearer ${feed.authCredentials.token}`;
        }
        break;
      case 'api-key':
        if (feed.authCredentials?.headerName && feed.authCredentials?.headerValue) {
          config.headers[feed.authCredentials.headerName] = feed.authCredentials.headerValue;
        }
        break;
    }

    const response = await axios.get(feed.feedUrl, config);
    return Buffer.from(response.data);
  }

  /**
   * Parse raw buffer into array of objects based on file format
   */
  async parseFeed(buffer: Buffer, format: string): Promise<any[]> {
    switch (format) {
      case 'xml': {
        const xmlString = buffer.toString('utf-8');
        const result = await parseStringPromise(xmlString, {
          explicitArray: false,
          ignoreAttrs: true,
          mergeAttrs: false
        });

        // Auto-detect the repeating element (first array found)
        const findArray = (obj: any): any[] | null => {
          if (Array.isArray(obj)) return obj;
          if (typeof obj === 'object' && obj !== null) {
            for (const key of Object.keys(obj)) {
              const childArray = findArray(obj[key]);
              if (childArray) return childArray;
            }
          }
          return null;
        };

        const found = findArray(result);

        // Flatten nested image objects (e.g. resimler.resim_N → top-level resim_N)
        const flattenImages = (items: any[]): any[] => {
          return items.map((item: any) => {
            const flat = { ...item };
            for (const key of Object.keys(flat)) {
              const val = flat[key];
              if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
                // Check if object has resim_N keys
                const subKeys = Object.keys(val);
                const isImageGroup = subKeys.some(k => /^resim_\d+$/i.test(k));
                if (isImageGroup) {
                  for (const subKey of subKeys) {
                    if (typeof val[subKey] === 'string' && val[subKey].startsWith('http')) {
                      flat[subKey] = val[subKey];
                    }
                  }
                  // Also keep the original object for direct mapping
                  flat[key] = val;
                }
              }
            }
            return flat;
          });
        };

        if (found) return flattenImages(found);

        // Fallback: single object wrapper
        if (typeof result === 'object' && result !== null) {
          const keys = Object.keys(result);
          if (keys.length === 1 && typeof result[keys[0]] === 'object') {
            const arr = Array.isArray(result[keys[0]]) ? result[keys[0]] : [result[keys[0]]];
            return flattenImages(arr);
          }
          return flattenImages([result]);
        }
        return [];
      }

      case 'csv': {
        const workbook = xlsx.read(buffer, { type: 'buffer', raw: true });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        return xlsx.utils.sheet_to_json(sheet, { defval: '' });
      }

      case 'xlsx':
      case 'xls': {
        const workbook = xlsx.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        return xlsx.utils.sheet_to_json(sheet);
      }

      case 'json': {
        const text = buffer.toString('utf-8');
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) return parsed;
        // Find first array in object
        const findArray = (obj: any): any[] | null => {
          if (Array.isArray(obj)) return obj;
          if (typeof obj === 'object' && obj !== null) {
            for (const key of Object.keys(obj)) {
              const childArray = findArray(obj[key]);
              if (childArray) return childArray;
            }
          }
          return null;
        };
        return findArray(parsed) || [];
      }

      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * Apply field mapping and settings to raw parsed data
   */
  applyMapping(rawProducts: any[], mapping: Record<string, string>, feed: ExternalFeed): MappedProduct[] {
    return rawProducts.map((raw: any) => {
      const product: MappedProduct = { title: '', sku: '' };

      // Apply field mapping
      for (const [productField, sourceField] of Object.entries(mapping)) {
        if (!sourceField) continue;
        let value = raw[sourceField];

        // Handle dot notation for nested fields (e.g. "resimler.resim_1")
        if (value === undefined && sourceField.includes('.')) {
          const parts = sourceField.split('.');
          let obj: any = raw;
          for (const part of parts) {
            if (obj === undefined || obj === null) break;
            obj = obj[part];
          }
          value = obj;
        }

        if (value === undefined) continue;

        // Handle CDATA-wrapped values (already unwrapped by xml2js)
        if (typeof value === 'string') {
          value = value.trim();
        }

        // Auto-collect image URLs from any object with resim_N keys
        if (typeof value === 'object' && value !== null) {
          const subKeys = Object.keys(value);
          const isImageGroup = subKeys.some(k => /^resim_\d+$/i.test(k));
          if (isImageGroup) {
            if (!product.images) product.images = [];
            for (const subKey of subKeys) {
              if (typeof value[subKey] === 'string' && value[subKey].trim().startsWith('http')) {
                product.images.push(value[subKey].trim());
              }
            }
            continue;
          }
        }

        // Handle image fields: collect values starting with http
        if (typeof value === 'string' && value.startsWith('http') && (
          productField === 'images' || productField.startsWith('image')
        )) {
          if (!product.images) product.images = [];
          product.images.push(value);
          continue;
        }

        product[productField] = value;
      }

      // Auto-detect images from raw data (even if not mapped)
      if (!product.images || product.images.length === 0) {
        for (const key of Object.keys(raw)) {
          const val = raw[key];
          if (typeof val === 'object' && val !== null) {
            const subKeys = Object.keys(val);
            if (subKeys.some(k => /^resim_\d+$/i.test(k))) {
              product.images = subKeys
                .map(k => val[k])
                .filter((v: any) => typeof v === 'string' && v.trim().startsWith('http'))
                .map((v: string) => v.trim());
              if (product.images.length > 0) break;
            }
          }
          // Also check top-level resim_N keys (from flattenImages)
          if (/^resim_\d+$/i.test(key) && typeof val === 'string' && val.startsWith('http')) {
            if (!product.images) product.images = [];
            product.images.push(val.trim());
          }
        }
      }

      // Apply pricing mode
      if (feed.pricingMode === 'fixed') {
        const rawPrice = parseFloat(product.priceTRY as any) || 0;
        const multiplier = feed.priceMultiplier || 1;
        if (feed.currency === 'USD' && rawPrice > 0) {
          // USD price: apply multiplier, then convert to TRY during sync
          product.priceUSD = rawPrice * multiplier;
          product.priceTRY = 0; // Clear TRY so convertUSDPrices will convert
        } else {
          product.priceTRY = rawPrice * multiplier;
        }
      }

      // Apply defaults for empty fields
      if (!product.category && feed.defaultCategory) {
        product.category = feed.defaultCategory;
      }
      if (!product.quantity && feed.defaultQuantity) {
        product.quantity = feed.defaultQuantity;
      }
      if (feed.defaultGramWeight) product.gramWeight = feed.defaultGramWeight;
      if (feed.defaultMilyem) product.milyem = feed.defaultMilyem;
      if (feed.defaultProfitMargin) product.profitMargin = feed.defaultProfitMargin;
      if (feed.priceMultiplier) product.priceMultiplier = feed.priceMultiplier;

      // Parse numeric fields
      if (product.priceTRY) product.priceTRY = parseFloat(product.priceTRY as any);
      if (product.priceUSD) product.priceUSD = parseFloat(product.priceUSD as any);
      if (product.quantity) product.quantity = parseInt(product.quantity as any, 10);
      if (product.gramWeight) product.gramWeight = parseFloat(product.gramWeight as any);
      if (product.milyem) product.milyem = parseInt(product.milyem as any, 10);

      // Handle isActive from string
      if (product.isActive !== undefined) {
        if (typeof product.isActive === 'string') {
          product.isActive = product.isActive === '1' || product.isActive === 'true' || product.isActive === 'aktif';
        }
      }

      return product;
    });
  }

  /**
   * Calculate gold-formula prices for products that don't have a fixed price
   */
  async calculateGoldPrices(products: MappedProduct[]): Promise<MappedProduct[]> {
    const gold = await goldPriceService.getCurrentGoldPrice();

    return products.map(p => {
      if (p.priceTRY && p.priceTRY > 0) return p;

      const gw = p.gramWeight || 0;
      const ml = p.milyem || 916;
      const pm = p.profitMargin || 0;
      const pmul = p.priceMultiplier || 1;

      if (gw > 0) {
        const { priceTRY } = goldPriceService.calculatePrice(gw, ml, pm, gold.pricePerGramTRY, pmul);
        p.priceTRY = priceTRY;
        p.priceUSD = Math.round((priceTRY / gold.usdTryRate) * 100) / 100;
      }

      return p;
    });
  }

  /**
   * Convert USD prices to TRY
   */
  async convertUSDPrices(products: MappedProduct[]): Promise<MappedProduct[]> {
    const gold = await goldPriceService.getCurrentGoldPrice();

    return products.map(p => {
      if (p.priceUSD && p.priceUSD > 0 && (!p.priceTRY || p.priceTRY === 0)) {
        p.priceTRY = Math.round(p.priceUSD * gold.usdTryRate * 100) / 100;
      }
      return p;
    });
  }

  /**
   * Main sync: fetch → parse → map → upsert
   */
  async syncFeed(feedId: string): Promise<SyncResult> {
    const feed = await ExternalFeed.findByPk(feedId);
    if (!feed) throw new Error('Feed not found');
    if (!feed.isActive) throw new Error('Feed is not active');

    const log = await FeedSyncLog.create({
      feedId: feed.id,
      storeId: feed.storeId,
      status: 'running',
      startedAt: new Date()
    });

    const result: SyncResult = { total: 0, added: 0, updated: 0, skipped: 0, failed: 0, errors: [] };

    try {
      // 1. Fetch
      const buffer = await this.fetchFeed(feed);
      // 2. Parse
      const rawData = await this.parseFeed(buffer, feed.fileFormat);
      result.total = rawData.length;

      if (rawData.length === 0) {
        result.skipped = 0;
        await log.update({ status: 'success', completedAt: new Date(), summary: result });
        await feed.update({ lastSyncAt: new Date(), lastSyncResult: result });
        return result;
      }

      // 3. Apply mapping
      let mappedProducts = this.applyMapping(rawData, feed.fieldMapping || {}, feed);

      // 4. Apply pricing
      if (feed.currency === 'USD') {
        mappedProducts = await this.convertUSDPrices(mappedProducts);
      }
      if (feed.pricingMode === 'gold-formula') {
        mappedProducts = await this.calculateGoldPrices(mappedProducts);
      }

      // 5. Upsert by SKU
      for (const prod of mappedProducts) {
        try {
          if (!prod.title || !prod.sku) {
            result.skipped++;
            continue;
          }

          const slug = prod.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + (prod.sku as string).toLowerCase();

          const existingProduct = await Product.findOne({
            where: { sku: prod.sku as string, storeId: feed.storeId }
          });

          const productData: any = {
            storeId: feed.storeId,
            title: prod.title,
            slug,
            description: prod.description || '',
            category: prod.category || feed.defaultCategory || 'Genel',
            categoryId: prod.categoryId || feed.defaultCategoryId || undefined,
            sku: prod.sku,
            gramWeight: prod.gramWeight || 1,
            milyem: prod.milyem || 585,
            profitMargin: prod.profitMargin || 0,
            priceMultiplier: prod.priceMultiplier || feed.priceMultiplier || 1,
            priceTRY: prod.priceTRY || 0,
            priceUSD: prod.priceUSD || 0,
            quantity: prod.quantity || 0,
            images: prod.images || [],
            marketplaces: feed.defaultMarketplaces || ['golden'],
            isB2BEnabled: feed.defaultIsB2BEnabled || false,
            isActive: prod.isActive !== undefined ? prod.isActive : true,
            feedSourceId: feed.id,
            tags: prod.tags || []
          };

          if (existingProduct) {
            await existingProduct.update(productData);
            result.updated++;
          } else {
            await Product.create(productData as any);
            result.added++;
          }
        } catch (err: any) {
          result.failed++;
          result.errors.push(`SKU ${prod.sku}: ${err.message}`);
        }
      }

      // 6. Update log & feed
      await log.update({ status: 'success', completedAt: new Date(), summary: result });
      await feed.update({ lastSyncAt: new Date(), lastSyncResult: result });

    } catch (err: any) {
      result.errors.push(err.message);
      await log.update({ status: 'failed', completedAt: new Date(), summary: result });
      await feed.update({ lastSyncResult: result });
    }

    return result;
  }

  /**
   * Test fetch and parse, returns sample data
   */
  async testFeed(feed: ExternalFeed): Promise<{ headers: string[]; sampleData: any[]; total: number }> {
    const buffer = await this.fetchFeed(feed);
    const data = await this.parseFeed(buffer, feed.fileFormat);
    const headers = data.length > 0 ? Object.keys(data[0]) : [];
    // Also include flattened image keys (resim_1, resim_2, etc.) for easier mapping
    const extendedHeaders = new Set(headers);
    for (const item of data) {
      for (const key of Object.keys(item)) {
        if (/^resim_\d+$/i.test(key)) extendedHeaders.add(key);
      }
    }
    return { headers: Array.from(extendedHeaders), sampleData: data.slice(0, 5), total: data.length };
  }

  /**
   * Preview mapping on sample data
   */
  async previewMapping(feed: ExternalFeed): Promise<MappedProduct[]> {
    const buffer = await this.fetchFeed(feed);
    const data = await this.parseFeed(buffer, feed.fileFormat);
    const sample = data.slice(0, 5);
    return this.applyMapping(sample, feed.fieldMapping || {}, feed);
  }
}

export default new FeedService();
