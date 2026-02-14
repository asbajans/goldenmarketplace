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

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.user = decoded;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({
      error: {
        message: 'Invalid or expired token',
        status: 401
      }
    });
    return;
  }
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

export const sellerMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user?.userType !== 'seller' && req.user?.userType !== 'admin') {
    res.status(403).json({
      error: {
        message: 'Seller access required',
        status: 403
      }
    });
    return;
  }
  next();
};
