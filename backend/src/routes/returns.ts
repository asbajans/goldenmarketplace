/**
 * Return Routes
 * Customer: own orders only (auth). Seller: own store only (auth + seller).
 */
import express from 'express';
import { ReturnController } from '../controllers/returnController';
import { authMiddleware, sellerMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

// Customer
router.post('/', authMiddleware, ReturnController.create);
router.get('/', authMiddleware, ReturnController.myList);
router.get('/seller', authMiddleware, sellerMiddleware, ReturnController.sellerList);
router.get('/:id', authMiddleware, ReturnController.myGet);
router.post('/:id/ship', authMiddleware, ReturnController.ship);
router.post('/:id/cancel', authMiddleware, ReturnController.cancel);

// Seller actions
router.post('/:id/respond', authMiddleware, sellerMiddleware, ReturnController.respond);
router.post('/:id/inspect', authMiddleware, sellerMiddleware, ReturnController.inspect);
router.post('/:id/refund', authMiddleware, sellerMiddleware, ReturnController.refund);

export default router;
