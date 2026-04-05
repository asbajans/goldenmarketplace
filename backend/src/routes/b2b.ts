/**
 * B2B Routes
 * All routes require authentication (seller or admin) EXCEPT the public store page.
 */

import express from 'express';
import B2BController from '../controllers/b2bController';
import { authMiddleware, sellerMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

// --- PUBLIC route: store page (no auth required, optional token) ---
// optionalAuth: sets req.user if token present, but doesn't block if absent
const optionalAuth = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authMiddleware(req, res, next);
  }
  next();
};

router.get('/store/:storeSlug', optionalAuth, B2BController.getStoreProducts);

// --- Protected routes: require seller/admin auth ---
router.use(authMiddleware, sellerMiddleware);

// Product discovery
router.get('/products', B2BController.getB2BProducts);

// Listing requests
router.post('/requests', B2BController.createRequest);
router.get('/requests/incoming', B2BController.getIncomingRequests);
router.get('/requests/outgoing', B2BController.getOutgoingRequests);
router.put('/requests/:id/approve', B2BController.approveRequest);
router.put('/requests/:id/reject', B2BController.rejectRequest);
router.post('/requests/:id/list', B2BController.listB2BProduct);

export default router;
