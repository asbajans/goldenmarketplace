import { Request, Response, NextFunction } from 'express';
import JWTService from '../utils/jwt';
import Store from '../models/Store';
import dotenv from 'dotenv';

dotenv.config();

declare global {
  namespace Express {
    interface Request {
      user?: any;
      token?: string;
      store?: any; // cached store object for seller requests
    }
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    res.status(401).json({
      error: {
        message: 'No token provided',
        status: 401
      }
    });
    return;
  }

  const decoded = JWTService.verifyToken(token);
  if (!decoded) {
    res.status(401).json({
      error: {
        message: 'Invalid or expired token',
        status: 401
      }
    });
    return;
  }

  req.user = decoded;
  req.token = token;
  next();
};

export const adminMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user?.userType !== 'admin') {
    res.status(403).json({
      error: {
        message: 'Admin access required',
        status: 403
      }
    });
    return;
  }
  next();
};

export const sellerMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (req.user?.userType !== 'seller' && req.user?.userType !== 'admin') {
    res.status(403).json({
      error: {
        message: 'Seller access required',
        status: 403
      }
    });
    return;
  }

  // Pre-fetch & cache store on req so controllers don't each do their own Store.findOne
  if (req.user?.userType === 'seller' && !req.store) {
    try {
      const store = await Store.findOne({
        where: { userId: req.user.id },
        attributes: ['id', 'storeName', 'storeSlug', 'isActive', 'autoPriceSync']
      });
      req.store = store;
    } catch (err) {
      console.error('[sellerMiddleware] Store lookup failed:', err);
      // Don't block — let controllers handle missing store gracefully
    }
  }

  next();
};
