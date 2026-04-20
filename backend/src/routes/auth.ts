/**
 * Auth Routes
 */

import express from 'express';
import AuthController from '../controllers/authController';
import { authMiddleware } from '../middleware/authMiddleware';
import { validateRequest, schemas } from '../utils/validation';

const router = express.Router();

// Public routes
router.post('/register', validateRequest(schemas.register), AuthController.register);
router.post('/login', validateRequest(schemas.login), AuthController.login);
router.post('/refresh', AuthController.refreshToken);
router.post('/fast-signup', AuthController.fastSignup);
router.post('/google', AuthController.googleAuth);

// Protected routes
router.get('/me', authMiddleware, AuthController.getCurrentUser);
router.post('/me', authMiddleware, AuthController.getCurrentUser);

export default router;
