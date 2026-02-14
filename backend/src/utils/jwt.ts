/**
 * JWT Utilities
 * Token generation and verification
 */

import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';

export interface TokenPayload {
  id: string;
  email: string;
  userType: 'seller' | 'customer' | 'admin';
  iat?: number;
  exp?: number;
}

export class JWTService {
  /**
   * Generate a new JWT token
   */
  static generateToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload as any, JWT_SECRET as any, {
      expiresIn: JWT_EXPIRY,
      algorithm: 'HS256'
    } as any);
  }

  /**
   * Verify a JWT token
   */
  static verifyToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
      return decoded;
    } catch (error) {
      return null;
    }
  }

  /**
   * Decode token without verification (use carefully)
   */
  static decodeToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.decode(token) as TokenPayload;
      return decoded;
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate both access and refresh tokens
   */
  static generateTokenPair(payload: Omit<TokenPayload, 'iat' | 'exp'>) {
    const accessToken = jwt.sign(payload as any, JWT_SECRET as any, {
      expiresIn: '1h',
      algorithm: 'HS256'
    } as any);

    const refreshToken = jwt.sign(payload as any, JWT_SECRET as any, {
      expiresIn: '7d',
      algorithm: 'HS256'
    } as any);

    return { accessToken, refreshToken };
  }
}

export default JWTService;
