
import { Router } from 'express';
import { FeedController } from '../controllers/feedController';

const router = Router();

// Dynamic feeds per store (no auth required for indexing)
router.get('/google/:storeSlug.xml', FeedController.googleShoppingFeed);
router.get('/instagram/:storeSlug.xml', FeedController.facebookCatalogFeed); // FB/IG feeds are often XML as well in standard RSS format, but we'll adapt to what is there. Let's redirect to json or support xml.
router.get('/facebook/:storeSlug.json', FeedController.facebookCatalogFeed);
router.get('/share/:slug', FeedController.getProductShareData);

export default router;
