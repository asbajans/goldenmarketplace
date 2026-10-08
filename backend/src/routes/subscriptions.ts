
import { Router } from 'express';
import { SubscriptionController } from '../controllers/subscriptionController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Public/Seller-facing: Get all active plans
router.get('/plans', SubscriptionController.getPlans.bind(SubscriptionController));

// Protected routes
router.use(authMiddleware);

router.get('/me', SubscriptionController.mySubscription.bind(SubscriptionController));
router.get('/my-payments', SubscriptionController.myPayments.bind(SubscriptionController));
router.post('/checkout', SubscriptionController.checkout.bind(SubscriptionController));
router.get('/verify-session', SubscriptionController.verifySession.bind(SubscriptionController));
// LEGACY (mock üretmez): eski stripePriceId tabanlı akış
router.post('/create-checkout-session', SubscriptionController.createCheckoutSession.bind(SubscriptionController));
// NOT: mock-activate KALDIRILDI — ödeme alınmadan paket aktifleştirilemez.

export default router;
