/**
 * Crypto Payment Service
 * Handle USDT TRC20 payments
 */

import { Store } from '../models';

interface CryptoPayment {
  id: string;
  orderId: string;
  amount: number;
  walletAddress: string;
  currency: string;
  txHash?: string;
  status: 'pending' | 'confirmed' | 'rejected';
  confirmedAt?: Date;
  confirmedBy?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class CryptoPaymentService {
  private readonly CRYPTO_CURRENCIES = ['USDT', 'USDC', 'TRX'];
  private readonly NETWORK = 'TRC20';

  /**
   * Get crypto wallet address for a store
   */
  async getStoreCryptoWallet(storeId: string): Promise<string | null> {
    try {
      const store = await Store.findOne({
        where: { id: storeId },
        attributes: ['cryptoWallet']
      });
      return store?.cryptoWallet || null;
    } catch (error) {
      console.error('Error fetching crypto wallet:', error);
      throw error;
    }
  }

  /**
   * Set crypto wallet address for a store
   */
  async setStoreCryptoWallet(storeId: string, walletAddress: string): Promise<void> {
    const validAddress = this.validateTRC20Address(walletAddress);
    if (!validAddress) {
      throw new Error('Invalid USDT TRC20 wallet address');
    }

    await Store.update(
      { cryptoWallet: walletAddress },
      { where: { id: storeId } }
    );
  }

  /**
   * Validate TRC20 address format
   */
  validateTRC20Address(address: string): boolean {
    return /^T[a-zA-Z0-9]{33}$/.test(address);
  }

  /**
   * Generate QR code URL for wallet
   */
  generateQRCodeUrl(address: string, amount?: number, currency: string = 'USDT'): string {
    const params = new URLSearchParams({
      address,
      currency,
      network: this.NETWORK
    });
    if (amount) {
      params.set('amount', amount.toString());
    }
    return `tron:${params.toString()}`;
  }

  /**
   * Get supported currencies
   */
  getSupportedCurrencies(): string[] {
    return this.CRYPTO_CURRENCIES;
  }

  /**
   * Create pending crypto payment record
   */
  async createPendingPayment(orderId: string, amount: number, walletAddress: string): Promise<CryptoPayment> {
    if (!this.validateTRC20Address(walletAddress)) {
      throw new Error('Invalid TRC20 wallet address');
    }

    return {
      id: `cp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      orderId,
      amount,
      walletAddress,
      currency: 'USDT',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Record transaction hash (for tracking)
   */
  async recordTransactionHash(paymentId: string, txHash: string): Promise<void> {
    console.log(`Recorded TX: ${paymentId} -> ${txHash}`);
  }

  /**
   * Confirm crypto payment (admin action)
   */
  async confirmPayment(paymentId: string, confirmedBy: string, txHash?: string, notes?: string): Promise<CryptoPayment> {
    return {
      id: paymentId,
      orderId: `order_${paymentId}`,
      amount: 0,
      walletAddress: '',
      currency: 'USDT',
      txHash,
      status: 'confirmed',
      confirmedBy,
      notes,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Reject crypto payment
   */
  async rejectPayment(paymentId: string, confirmedBy: string, reason: string): Promise<CryptoPayment> {
    return {
      id: paymentId,
      orderId: `order_${paymentId}`,
      amount: 0,
      walletAddress: '',
      currency: 'USDT',
      status: 'rejected',
      confirmedBy,
      notes: reason,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Get payment instructions for display
   */
  getPaymentInstructions(walletAddress: string): string[] {
    return [
      `1. Open your TRON (TRC20) wallet app`,
      `2. Send USDT to: ${walletAddress}`,
      `3. Wait for network confirmation (usually 1-3 minutes)`,
      `4. Save your transaction hash for reference`
    ];
  }
}

export default new CryptoPaymentService();