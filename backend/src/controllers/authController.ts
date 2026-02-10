/**
 * Auth Controller
 * Handle authentication operations
 */

import { Request, Response } from 'express';
import User from '../models/User';
import JWTService from '../utils/jwt';
import PasswordService from '../utils/password';

export class AuthController {
  /**
   * User registration
   */
  static async register(req: Request, res: Response) {
    try {
      const { email, password, firstName, lastName, userType } = req.body;

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
        userType: userType || 'customer',
        isActive: true
      });

      // Generate token
      const token = JWTService.generateToken({
        id: user.id,
        email: user.email,
        userType: user.userType
      });

      return res.status(201).json({
        message: 'User registered successfully',
        token,
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
      const user = await User.findOne({ where: { email } });
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
          userType: user.userType
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
   * Get current user
   */
  static async getCurrentUser(req: Request, res: Response) {
    try {
      const user = await User.findByPk(req.user?.id);

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
          isActive: user.isActive
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
