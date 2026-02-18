
import { Router } from 'express';
import { GoldPriceController } from '../controllers/goldPriceController';

const router = Router();

router.get('/current', GoldPriceController.getCurrentPrice);

export default router;
