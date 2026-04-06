import express from 'express';
import { VariationController } from '../controllers/variationController';
import { authMiddleware, sellerMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

router.use(authMiddleware);
router.use(sellerMiddleware);

router.get('/', VariationController.getVariations);
router.post('/', VariationController.createVariation);
router.put('/:id', VariationController.updateVariation);
router.delete('/:id', VariationController.deleteVariation);

export default router;
