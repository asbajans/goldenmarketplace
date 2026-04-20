/**
 * Auth Controller
 * Handle authentication operations
 */

import { Request, Response } from 'express';
import User from '../models/User';
import JWTService from '../utils/jwt';
import PasswordService from '../utils/password';
import Store from '../models/Store';

export class AuthController {
  /**
   * User registration
   */
  static async register(req: Request, res: Response) {
    try {
      const { email, password, firstName, lastName, userType, phone, storeName } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({
          error: {
            message: 'User with this email already exists',
            status: 400
          }
        });
      }

      // Hash password
      const hashedPassword = await PasswordService.hashPassword(password);

      // Create user
      const user = await User.create({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        userType: userType || 'customer',
        isActive: userType === 'seller' ? false : true,
        pendingStoreName: userType === 'seller' ? storeName : undefined
      });

      // Generate tokens
      const { accessToken, refreshToken } = JWTService.generateTokenPair({
        id: user.id,
        email: user.email,
        userType: user.userType
      });

      return res.status(201).json({
        message: userType === 'seller' ? 'Kayıt alındı. Yönetici onayının ardından hesabınız aktifleşecektir.' : 'User registered successfully',
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          userType: user.userType,
          createdAt: user.createdAt
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      return res.status(500).json({
        error: {
          message: 'Internal server error',
          status: 500
        }
      });
    }
  }

  /**
   * User login
   */
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await User.findOne({ 
        where: { email },
        include: [{ model: Store, as: 'store' }]
      });
      if (!user) {
        return res.status(401).json({
          error: {
            message: 'Invalid email or password',
            status: 401
          }
        });
      }

      // Check password
      const isValidPassword = await PasswordService.comparePassword(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({
          error: {
            message: 'Invalid email or password',
            status: 401
          }
        });
      }

      // Generate tokens
      const { accessToken, refreshToken } = JWTService.generateTokenPair({
        id: user.id,
        email: user.email,
        userType: user.userType
      });

      return res.status(200).json({
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          userType: user.userType,
          subscriptionPlan: user.subscriptionPlan,
          subscriptionStatus: user.subscriptionStatus,
          subscriptionEndDate: user.subscriptionEndDate,
          store: (user as any).store
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({
        error: {
          message: 'Internal server error',
          status: 500
        }
      });
    }
  }

  /**
   * Refresh access token
   */
  static async refreshToken(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          error: {
            message: 'Refresh token is required',
            status: 400
          }
        });
      }

      const payload = JWTService.verifyToken(refreshToken);
      if (!payload) {
        return res.status(401).json({
          error: {
            message: 'Invalid refresh token',
            status: 401
          }
        });
      }

      const newAccessToken = JWTService.generateToken({
        id: payload.id,
        email: payload.email,
        userType: payload.userType
      });

      return res.status(200).json({
        accessToken: newAccessToken
      });
    } catch (error) {
      console.error('Refresh token error:', error);
      return res.status(500).json({
        error: {
          message: 'Internal server error',
          status: 500
        }
      });
    }
  }

  /**
   * Fast signup - minimal registration for customers
   */
  static async fastSignup(req: Request, res: Response) {
    try {
      const { email, firstName } = req.body;

      if (!email) {
        return res.status(400).json({
          error: { message: 'Email is required', status: 400 }
        });
      }

      const existingUser = await User.findOne({ where: { email } });
      
      if (existingUser) {
        const { accessToken, refreshToken } = JWTService.generateTokenPair({
          id: existingUser.id,
          email: existingUser.email,
          userType: existingUser.userType
        });
        return res.status(200).json({
          accessToken,
          refreshToken,
          user: {
            id: existingUser.id,
            email: existingUser.email,
            firstName: existingUser.firstName,
            lastName: existingUser.lastName,
            userType: existingUser.userType
          }
        });
      }

      const hashedPassword = await PasswordService.hashPassword(Math.random().toString(36).slice(2) + Date.now().toString());
      
      const newUser = await User.create({
        email,
        password: hashedPassword,
        firstName: firstName || email.split('@')[0],
        lastName: '',
        userType: 'customer',
        isActive: true
      });

      const { accessToken, refreshToken } = JWTService.generateTokenPair({
        id: newUser.id,
        email: newUser.email,
        userType: newUser.userType
      });

      return res.status(201).json({
        accessToken,
        refreshToken,
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          userType: newUser.userType
        }
      });
    } catch (error) {
      console.error('Fast signup error:', error);
      return res.status(500).json({
        error: { message: 'Internal server error', status: 500 }
      });
    }
  }

  /**
   * Google OAuth signup/login
   */
  static async googleAuth(req: Request, res: Response) {
    try {
      const { googleToken, email, firstName, lastName } = req.body;

      if (!googleToken && !email) {
        return res.status(400).json({
          error: { message: 'Google token or email is required', status: 400 }
        });
      }

      let user = await User.findOne({ where: { email } });
      
      if (user) {
        const { accessToken, refreshToken } = JWTService.generateTokenPair({
          id: user.id,
          email: user.email,
          userType: user.userType
        });
        return res.status(200).json({
          accessToken,
          refreshToken,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            userType: user.userType
          }
        });
      }

      const hashedPassword = await PasswordService.hashPassword(Math.random().toString(36).slice(2) + Date.now().toString());
      
      user = await User.create({
        email,
        password: hashedPassword,
        firstName: firstName || email.split('@')[0],
        lastName: lastName || '',
        userType: 'customer',
        isActive: true
      });

      const { accessToken, refreshToken } = JWTService.generateTokenPair({
        id: user.id,
        email: user.email,
        userType: user.userType
      });

      return res.status(201).json({
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          userType: user.userType
        }
      });
    } catch (error) {
      console.error('Google auth error:', error);
      return res.status(500).json({
        error: { message: 'Internal server error', status: 500 }
      });
    }
  }

  /**
   * Get current user
   */
  static async getCurrentUser(req: Request, res: Response) {
    try {
      const user = await User.findByPk(req.user?.id, {
        include: [{ model: Store, as: 'store' }]
      });

      if (!user) {
        return res.status(404).json({
          error: {
            message: 'User not found',
            status: 404
          }
        });
      }

      return res.status(200).json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          userType: user.userType,
          isActive: user.isActive,
          subscriptionPlan: user.subscriptionPlan,
          subscriptionStatus: user.subscriptionStatus,
          subscriptionEndDate: user.subscriptionEndDate,
          store: (user as any).store
        }
      });
    } catch (error) {
      console.error('Get user error:', error);
      return res.status(500).json({
        error: {
          message: 'Internal server error',
          status: 500
        }
      });
    }
  }
}

export default AuthController;
