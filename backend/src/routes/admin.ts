import { Router } from 'express';
import { authMiddleware, adminMiddleware } from '../middleware/authMiddleware';
import { AdminController } from '../controllers/adminController';
import { SettingsController } from '../controllers/settingsController';

const router = Router();

// Apply auth middleware to all admin routes
router.use(authMiddleware);
router.use(adminMiddleware);

// --- USERS ---
router.get('/users', AdminController.getUsers);
router.post('/users', AdminController.createUser);
router.put('/users/:id', AdminController.updateUser);
router.delete('/users/:id', AdminController.deleteUser);
router.put('/users/:id/assign-plan', AdminController.assignPlanToUser);

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

// --- ALL PRODUCTS (admin view) ---
router.get('/products', AdminController.getAllProducts);
router.put('/products/:id', AdminController.updateProductByAdmin);

// --- INTEGRATIONS ---
router.get('/integrations', AdminController.getIntegrations);
router.get('/integration-logs', AdminController.getIntegrationLogs);

// --- GLOBAL SETTINGS ---
router.get('/settings', SettingsController.getSettings);
router.post('/settings', SettingsController.updateSettings);

// --- ORDERS ---
import adminOrdersRouter from './adminOrders';
router.use('/', adminOrdersRouter);

export default router;
