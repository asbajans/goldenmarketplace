import { Router } from 'express';
import { AIController } from '../controllers/aiController';
import { authMiddleware, adminMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Admin AI settings
router.get('/admin/settings', authMiddleware, adminMiddleware, AIController.getAISettings);
router.put('/admin/settings', authMiddleware, adminMiddleware, AIController.updateAISettings);
router.post('/admin/settings/test', authMiddleware, adminMiddleware, AIController.testAIConnection);

// Seller AI operations (per product)
router.post('/products/:id/translate', authMiddleware, AIController.translateProduct);
router.post('/products/:id/generate', authMiddleware, AIController.generateContent);
router.get('/products/:id/ai-status', authMiddleware, AIController.getProductAIStatus);

// Seller AI task list
router.get('/tasks', authMiddleware, AIController.listAITasks);

// Seller bulk AI
router.post('/products/bulk-ai', authMiddleware, AIController.bulkAITranslate);

// Credits
router.get('/credits/balance', authMiddleware, AIController.getCreditBalance);
router.get('/credits/prices', authMiddleware, AIController.getCreditPrices);
router.post('/credits/purchase', authMiddleware, AIController.purchaseCredits);

export default router;
