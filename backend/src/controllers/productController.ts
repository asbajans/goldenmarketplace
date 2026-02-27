/**
 * Product Controller
 * Handle product operations with gold-gram pricing
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
        error: { message: 'Internal server error', status: 500 }
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
        images, videoUrl, marketplaces, gramWeight, milyem
      } = req.body;

      // Validate required gold fields
      if (!gramWeight || gramWeight <= 0) {
        return res.status(400).json({
          error: { message: 'Gram ağırlığı zorunludur ve 0\'dan büyük olmalıdır.', status: 400 }
        });
      }
      if (!milyem || ![333, 585, 750, 916, 999].includes(milyem)) {
        return res.status(400).json({
          error: { message: 'Geçerli bir milyem değeri giriniz (333, 585, 750, 916, 999).', status: 400 }
        });
      }

      // Find store for current user
      const store = await Store.findOne({ where: { userId: req.user.id } });
      if (!store) {
        return res.status(400).json({
          error: { message: 'You do not have a store created yet.', status: 400 }
        });
      }

      // Calculate prices from gram + milyem
      const { priceTRY, priceUSD } = await goldPriceService.calculateProductPrice(gramWeight, milyem);
      const tags = ProductController.generateTags(title, category);

      const product = await Product.create({
        storeId: store.id,
        title,
        slug: title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        description,
        category,
        sku,
        gramWeight,
        milyem,
        priceTRY,
        priceUSD,
        quantity,
        images: images || [],
        videoUrl,
        marketplaces: marketplaces || [],
        tags,
        isActive: true
      });

      // Trigger marketplace sync
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
        error: { message: 'Internal server error', status: 500 }
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
        title, description, category, quantity,
        images, videoUrl, marketplaces, gramWeight, milyem
      } = req.body;

      const product = await Product.findByPk(id);
      if (!product) {
        return res.status(404).json({
          error: { message: 'Product not found', status: 404 }
        });
      }

      // Recalculate prices if gram/milyem changed
      const finalGramWeight = gramWeight || product.gramWeight;
      const finalMilyem = milyem || product.milyem;
      const { priceTRY, priceUSD } = await goldPriceService.calculateProductPrice(
        Number(finalGramWeight), Number(finalMilyem)
      );

      const tags = ProductController.generateTags(
        title || product.title,
        category || product.category
      );

      await product.update({
        title: title || product.title,
        description: description || product.description,
        category: category || product.category,
        gramWeight: finalGramWeight,
        milyem: finalMilyem,
        priceTRY,
        priceUSD,
        quantity: quantity !== undefined ? quantity : product.quantity,
        images: images || product.images,
        videoUrl: videoUrl !== undefined ? videoUrl : product.videoUrl,
        marketplaces: marketplaces || product.marketplaces,
        tags
      });

      // Trigger marketplace sync
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
        error: { message: 'Internal server error', status: 500 }
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
          error: { message: 'Product not found', status: 404 }
        });
      }

      await product.destroy();

      return res.status(200).json({
        message: 'Product deleted successfully'
      });
    } catch (error) {
      console.error('Delete product error:', error);
      return res.status(500).json({
        error: { message: 'Internal server error', status: 500 }
      });
    }
  }

  /**
   * Calculate gold price preview (for frontend live display)
   */
  static async calculateGoldPrice(req: Request, res: Response) {
    try {
      const { gramWeight, milyem } = req.body;

      if (!gramWeight || gramWeight <= 0 || !milyem) {
        return res.status(400).json({
          error: { message: 'gramWeight and milyem are required', status: 400 }
        });
      }

      const gold = await goldPriceService.getCurrentGoldPrice();
      const { priceTRY, priceUSD } = await goldPriceService.calculateProductPrice(gramWeight, milyem);

      return res.status(200).json({
        gramWeight,
        milyem,
        gold24KGramTRY: gold.pricePerGramTRY,
        usdTryRate: gold.usdTryRate,
        priceTRY,
        priceUSD
      });
    } catch (error) {
      console.error('Calculate gold price error:', error);
      return res.status(500).json({
        error: { message: 'Failed to calculate gold price', status: 500 }
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
