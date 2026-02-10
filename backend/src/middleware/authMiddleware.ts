/**
 * JWT Authentication Middleware
 * Validate JWT tokens and extract user information
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

declare global {
  namespace Express {
    interface Request {
      user?: any;
      token?: string;
    }
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: {
        message: 'No token provided',
        status: 401
      }
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.user = decoded;
    req.token = token;
    next();
  } catch (error) {
    return res.status(401).json({
      error: {
        message: 'Invalid or expired token',
        status: 401
      }
    });
  }
};

export const adminMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.userType !== 'admin') {
    return res.status(403).json({
      error: {
        message: 'Admin access required',
        status: 403
      }
    });
  }
  next();
};

export const sellerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.userType !== 'seller' && req.user?.userType !== 'admin') {
    return res.status(403).json({
      error: {
        message: 'Seller access required',
        status: 403
      }
    });
  }
  next();
};
