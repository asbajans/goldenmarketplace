import { Router } from 'express';
import { authMiddleware, adminMiddleware } from '../middleware/authMiddleware';
import { AdminController } from '../controllers/adminController';

const router = Router();

// Apply auth middleware to all admin routes
router.use(authMiddleware);
router.use(adminMiddleware);

// --- USERS ---
router.get('/users', AdminController.getUsers);
router.post('/users', AdminController.createUser);
router.put('/users/:id', AdminController.updateUser);
router.delete('/users/:id', AdminController.deleteUser);

// --- STORES (Sellers) ---
router.get('/stores', AdminController.getStores);
router.post('/stores', AdminController.createStore);
router.put('/stores/:id', AdminController.updateStore);
router.delete('/stores/:id', AdminController.deleteStore);

// --- CATEGORIES ---
router.get('/categories', AdminController.getCategories);
router.post('/categories', AdminController.createCategory);
router.put('/categories/:id', AdminController.updateCategory);
router.delete('/categories/:id', AdminController.deleteCategory);

// --- SUBSCRIPTION PLANS ---
router.get('/subscription-plans', AdminController.getSubscriptionPlans);
router.post('/subscription-plans', AdminController.createSubscriptionPlan);
router.put('/subscription-plans/:id', AdminController.updateSubscriptionPlan);
router.delete('/subscription-plans/:id', AdminController.deleteSubscriptionPlan);

// --- INTEGRATIONS ---
router.get('/integrations', AdminController.getIntegrations);

export default router;
