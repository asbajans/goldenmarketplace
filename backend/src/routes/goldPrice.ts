
import { Router } from 'express';
import { GoldPriceController } from '../controllers/goldPriceController';

const router = Router();

router.get('/current', GoldPriceController.getCurrentPrice);
router.post('/calculate', GoldPriceController.calculatePrice);
router.post('/refresh', GoldPriceController.forceRefresh);

export default router;
