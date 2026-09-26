import { Router, Request, Response, NextFunction } from 'express';
import { ReviewController } from '../controllers/reviewController';
import JWTService from '../utils/jwt';

const router = Router();

/**
 * Optional auth: attach req.user when a valid Bearer token is present,
 * otherwise continue as guest (never blocks).
 */
function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      const decoded = JWTService.verifyToken(token);
      if (decoded) (req as any).user = decoded;
    }
  } catch {
    /* guest mode */
  }
  next();
}

// Public — approved reviews + submit (guest or logged-in)
router.get('/product/:productId', ReviewController.listByProduct);
router.post('/product/:productId', optionalAuth, ReviewController.submit);

export default router;
