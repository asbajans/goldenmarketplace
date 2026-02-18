
import { Router } from 'express';
import { FeedController } from '../controllers/feedController';

const router = Router();

// Public feeds (no auth required)
router.get('/google.xml', FeedController.googleShoppingFeed);
router.get('/facebook.json', FeedController.facebookCatalogFeed);
router.get('/share/:slug', FeedController.getProductShareData);

export default router;
