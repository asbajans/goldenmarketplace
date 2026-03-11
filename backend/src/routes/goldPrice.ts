
import { Router } from 'express';
import { GoldPriceController } from '../controllers/goldPriceController';
import { authMiddleware, adminMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.get('/current', GoldPriceController.getCurrentPrice);
router.post('/calculate', GoldPriceController.calculatePrice);
router.post('/refresh', GoldPriceController.forceRefresh);

// Admin-only: manually set gold price (triggers product price update + marketplace sync)
router.post('/set', authMiddleware, adminMiddleware, GoldPriceController.setGoldPrice);

export default router;
