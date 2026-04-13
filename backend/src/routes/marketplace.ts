import express from 'express';
import MarketplaceController from '../controllers/marketplaceController';

const router = express.Router();

// Public B2C Marketplace Routes
router.get('/products', MarketplaceController.getProducts);
router.get('/products/:slug', MarketplaceController.getProductBySlug);

export default router;
