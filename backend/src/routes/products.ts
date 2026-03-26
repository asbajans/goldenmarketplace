/**
 * Product Routes
 */

import express from 'express';
import ProductController from '../controllers/productController';
import { authMiddleware, sellerMiddleware } from '../middleware/authMiddleware';
import { validateRequest, schemas } from '../utils/validation';

const router = express.Router();

// Use authMiddleware so we always know the user. If they are seller, productController restricts fetch.
router.get('/', authMiddleware, ProductController.getProducts);

// Protected routes
router.post('/', authMiddleware, sellerMiddleware, validateRequest(schemas.createProduct), ProductController.createProduct);
router.put('/:id', authMiddleware, sellerMiddleware, ProductController.updateProduct);
router.delete('/:id', authMiddleware, sellerMiddleware, ProductController.deleteProduct);

// Gold price calculation
router.post('/calculate-gold-price', authMiddleware, ProductController.calculateGoldPrice);

export default router;
