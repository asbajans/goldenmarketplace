/**
 * Product Controller
 * Handle product operations
 */

import { Request, Response } from 'express';
import Product from '../models/Product';
import goldPriceService from '../services/goldPriceService';

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
        where[Symbol.for('sequelize.where')] = {
          title: {
            [Symbol.for('sequelize.op').substring()]: search
          }
        };
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
      const { storeId, title, description, category, sku, basePrice, quantity, images } = req.body;

      // Calculate gold indexed price
      const goldIndexPrice = await goldPriceService.getPriceWithGoldIndexing(basePrice);

      const product = await Product.create({
        storeId,
        title,
        slug: title.toLowerCase().replace(/\s+/g, '-'),
        description,
        category,
        sku,
        basePrice,
        goldIndexPrice,
        quantity,
        images: images || [],
        isActive: true
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
      const { title, description, category, basePrice, quantity, images } = req.body;

      const product = await Product.findByPk(id);
      if (!product) {
        return res.status(404).json({
          error: {
            message: 'Product not found',
            status: 404
          }
        });
      }

      // Recalculate gold price if base price changed
      let goldIndexPrice = product.goldIndexPrice;
      if (basePrice) {
        goldIndexPrice = await goldPriceService.getPriceWithGoldIndexing(basePrice);
      }

      await product.update({
        title: title || product.title,
        description: description || product.description,
        category: category || product.category,
        basePrice: basePrice || product.basePrice,
        goldIndexPrice,
        quantity: quantity !== undefined ? quantity : product.quantity,
        images: images || product.images
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
}

export default ProductController;
