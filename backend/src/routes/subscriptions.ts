
import { Router } from 'express';
import { SubscriptionController } from '../controllers/subscriptionController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Public/Seller-facing: Get all active plans
router.get('/plans', SubscriptionController.getPlans.bind(SubscriptionController));

// Protected routes
router.use(authMiddleware);

router.post('/create-checkout-session', SubscriptionController.createCheckoutSession.bind(SubscriptionController));
router.post('/mock-activate', SubscriptionController.mockActivate.bind(SubscriptionController)); // Helper for demo

export default router;
