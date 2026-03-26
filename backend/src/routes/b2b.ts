/**
 * B2B Routes
 * All routes require authentication (seller or admin).
 */

import express from 'express';
import B2BController from '../controllers/b2bController';
import { authMiddleware, sellerMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

// All B2B routes require auth
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
