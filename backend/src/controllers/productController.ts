/**
 * Product Controller
 * Handle product operations
 */

import { Request, Response } from 'express';
import { Op } from 'sequelize';
import Product from '../models/Product';
import Store from '../models/Store';
import goldPriceService from '../services/goldPriceService';
import { productSyncQueue } from '../jobs/productSyncJob';

export class ProductController {
  /**
   * Get all products
   */
  static async getProducts(req: Request, res: Response) {
    try {
      const { storeId, category, page = 1, limit = 20, search } = req.query;

      const where: any = { isActive: true };

      if (storeId) where.storeId = storeId;
      if (category) where.category = category;
      if (search) {
        // use Sequelize Op for substring searches (Postgres supports ILIKE if needed)
        where.title = { [Op.substring]: String(search) };
      }

      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

      const { count, rows } = await Product.findAndCountAll({
        where,
        limit: parseInt(limit as string),
        offset,
        order: [['createdAt', 'DESC']]
      });

      return res.status(200).json({
        data: rows,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: count,
          pages: Math.ceil(count / parseInt(limit as string))
        }
      });
    } catch (error) {
      console.error('Get products error:', error);
      return res.status(500).json({
        error: {
          message: 'Internal server error',
          status: 500
        }
      });
    }
  }

  /**
   * Create product
   */
  static async createProduct(req: Request, res: Response) {
    try {
      const {
        title, description, category, sku, quantity,
        images, videoUrl, marketplaces, pricingType,
        basePrice, gramWeight
      } = req.body;

      // ... existing store finding code ...
      // Need to import Store model
      const store = await Store.findOne({ where: { userId: req.user.id } });
      if (!store) {
        return res.status(400).json({
          error: {
            message: 'You do not have a store created yet.',
            status: 400
          }
        });
      }

      // Calculate gold indexed price based on pricing type
      let calculatedBasePrice = basePrice || 0;
      let finalGramWeight = gramWeight || 0;

      if (pricingType === 'USD') {
        const usdRate = await goldPriceService.getUSDExchangeRate();
        calculatedBasePrice = basePrice * usdRate;
      } else if (pricingType === 'GRAM') {
        const goldPrice = await goldPriceService.getCurrentGoldPrice();
        calculatedBasePrice = gramWeight * goldPrice.price;
        finalGramWeight = gramWeight;
      }

      const goldIndexPrice = await goldPriceService.amountToGoldOunces(calculatedBasePrice);
      const tags = ProductController.generateTags(title, category);

      const product = await Product.create({
        storeId: store.id,
        title,
        slug: title.toLowerCase().replace(/\s+/g, '-'),
        description,
        category,
        sku,
        basePrice: calculatedBasePrice,
        goldIndexPrice,
        pricingType: pricingType || 'TL',
        gramWeight: finalGramWeight,
        quantity,
        images: images || [],
        videoUrl,
        marketplaces: marketplaces || [],
        tags,
        isActive: true
      });

      // Trigger Sync
      // @ts-ignore
      productSyncQueue.add({
        productId: product.id,
        userId: req.user.id,
        trigger: 'create'
      });

      return res.status(201).json({
        message: 'Product created successfully',
        product
      });
    } catch (error) {
      console.error('Create product error:', error);
      return res.status(500).json({
        error: {
          message: 'Internal server error',
          status: 500
        }
      });
    }
  }

  /**
   * Update product
   */
  static async updateProduct(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const {
        title, description, category, basePrice, quantity,
        images, videoUrl, marketplaces, pricingType, gramWeight
      } = req.body;

      const product = await Product.findByPk(id);
      if (!product) {
        return res.status(404).json({
          error: {
            message: 'Product not found',
            status: 404
          }
        });
      }

      // Recalculate if price fields changed
      let calculatedBasePrice = basePrice || product.basePrice;
      let finalGramWeight = gramWeight || product.gramWeight;
      const finalPricingType = pricingType || product.pricingType;

      if (pricingType || basePrice || gramWeight) {
        if (finalPricingType === 'USD') {
          const usdRate = await goldPriceService.getUSDExchangeRate();
          calculatedBasePrice = (basePrice || product.basePrice) * usdRate;
        } else if (finalPricingType === 'GRAM') {
          const goldPrice = await goldPriceService.getCurrentGoldPrice();
          calculatedBasePrice = (gramWeight || product.gramWeight) * goldPrice.price;
          finalGramWeight = gramWeight || product.gramWeight;
        }
      }

      const goldIndexPrice = await goldPriceService.amountToGoldOunces(calculatedBasePrice);
      const tags = ProductController.generateTags(title || product.title, category || product.category);

      await product.update({
        title: title || product.title,
        description: description || product.description,
        category: category || product.category,
        basePrice: calculatedBasePrice,
        goldIndexPrice,
        pricingType: finalPricingType,
        gramWeight: finalGramWeight,
        quantity: quantity !== undefined ? quantity : product.quantity,
        images: images || product.images,
        videoUrl: videoUrl !== undefined ? videoUrl : product.videoUrl,
        marketplaces: marketplaces || product.marketplaces,
        tags: tags
      });

      // Trigger Sync
      // @ts-ignore
      productSyncQueue.add({
        productId: product.id,
        userId: req.user.id,
        trigger: 'update'
      });

      return res.status(200).json({
        message: 'Product updated successfully',
        product
      });
    } catch (error) {
      console.error('Update product error:', error);
      return res.status(500).json({
        error: {
          message: 'Internal server error',
          status: 500
        }
      });
    }
  }

  /**
   * Delete product
   */
  static async deleteProduct(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const product = await Product.findByPk(id);
      if (!product) {
        return res.status(404).json({
          error: {
            message: 'Product not found',
            status: 404
          }
        });
      }

      await product.destroy();

      return res.status(200).json({
        message: 'Product deleted successfully'
      });
    } catch (error) {
      console.error('Delete product error:', error);
      return res.status(500).json({
        error: {
          message: 'Internal server error',
          status: 500
        }
      });
    }
  }

  /**
   * Calculate gold indexed price
   */
  static async calculateGoldPrice(req: Request, res: Response) {
    try {
      const { basePrice } = req.body;

      if (!basePrice || basePrice <= 0) {
        return res.status(400).json({
          error: {
            message: 'Valid base price is required',
            status: 400
          }
        });
      }

      const goldPrice = await goldPriceService.getCurrentGoldPrice();
      const goldOunces = await goldPriceService.amountToGoldOunces(basePrice);

      return res.status(200).json({
        basePrice,
        goldPrice: goldPrice.price,
        goldOunces,
        currency: 'XAU'
      });
    } catch (error) {
      console.error('Calculate gold price error:', error);
      return res.status(500).json({
        error: {
          message: 'Failed to calculate gold price',
          status: 500
        }
      });
    }
  }

  /**
   * Generate tags from title and category
   */
  private static generateTags(title: string, category: string): string[] {
    const combined = `${title} ${category}`.toLowerCase();
    const words = combined.split(/[\s,.-]+/).filter(w => w.length > 2);
    return Array.from(new Set(words));
  }
}

export default ProductController;
