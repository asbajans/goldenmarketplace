/**
 * Password Utilities
 * Hash and compare passwords
 */

import bcryptjs from 'bcryptjs';

export class PasswordService {
  /**
   * Hash a password
   */
  static async hashPassword(password: string): Promise<string> {
    const salt = await bcryptjs.genSalt(10);
    return bcryptjs.hash(password, salt);
  }

  /**
   * Compare plain password with hashed password
   */
  static async comparePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcryptjs.compare(plainPassword, hashedPassword);
  }
}

export default PasswordService;
