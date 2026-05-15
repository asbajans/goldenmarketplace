
import { Router } from 'express';
import { FeedController } from '../controllers/feedController';

const router = Router();

// Global feeds (all products, admin-managed merchant settings)
router.get('/google.xml', FeedController.googleShoppingFeed);
router.get('/facebook.json', FeedController.facebookCatalogFeed);
router.get('/instagram.json', FeedController.facebookCatalogFeed);

// Legacy per-store feeds (backward compat)
router.get('/google/:storeSlug.xml', FeedController.googleShoppingFeed);
router.get('/instagram/:storeSlug.xml', FeedController.facebookCatalogFeed);
router.get('/facebook/:storeSlug.json', FeedController.facebookCatalogFeed);
router.get('/share/:slug', FeedController.getProductShareData);

export default router;
