
import { Router } from 'express';
import { SubscriptionController } from '../controllers/subscriptionController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Protect all routes
router.use(authMiddleware);

router.post('/create-checkout-session', SubscriptionController.createCheckoutSession);
router.post('/mock-activate', SubscriptionController.mockActivate); // Helper for demo

export default router;
