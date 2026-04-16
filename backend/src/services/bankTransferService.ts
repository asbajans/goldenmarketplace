/**
 * Bank Transfer Service
 * Handle bank transfer payments and manual confirmation workflow
 */

import { Store } from '../models';

interface BankAccount {
  bankName: string;
  iban: string;
  accountNumber: string;
  accountHolder: string;
  branchCode?: string;
}

interface TransferOrder {
  id: string;
  orderId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'rejected';
  transferredAt?: Date;
  confirmedBy?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class BankTransferService {
  /**
   * Get bank account details for a store
   */
  async getStoreBankAccount(storeId: string): Promise<BankAccount | null> {
    try {
      const store = await Store.findOne({
        where: { id: storeId },
        attributes: ['bankName', 'iban', 'accountNumber', 'accountHolder', 'branchCode']
      });

      if (!store) return null;

      return {
        bankName: store.bankName || '',
        iban: store.iban || '',
        accountNumber: store.accountNumber || '',
        accountHolder: store.accountHolder || store.storeName || '',
        branchCode: store.branchCode || undefined
      };
    } catch (error) {
      console.error('Error fetching bank account:', error);
      throw error;
    }
  }

  /**
   * Validate IBAN format
   */
  validateIBAN(iban: string): boolean {
    const cleaned = iban.replace(/\s/g, '').toUpperCase();
    if (!/^TR\d{2}[A-Z0-9]{4}[A-Z0-9]{16}$/.test(cleaned)) {
      return false;
    }
    return true;
  }

  /**
   * Format IBAN for display
   */
  formatIBAN(iban: string): string {
    const cleaned = iban.replace(/\s/g, '').toUpperCase();
    return cleaned.match(/.{1,4}/g)?.join(' ') || iban;
  }

  /**
   * Generate transfer reference for order
   */
  generateTransferRef(orderId: string): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    return `GC${timestamp}${orderId.slice(0, 4).toUpperCase()}`;
  }

  /**
   * Create pending transfer record
   */
  async createPendingTransfer(orderId: string, amount: number, currency: string = 'TRY'): Promise<TransferOrder> {
    const transfer: TransferOrder = {
      id: `tr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      orderId,
      amount,
      currency,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    return transfer;
  }

  /**
   * Confirm bank transfer (admin action)
   */
  async confirmTransfer(transferId: string, confirmedBy: string, notes?: string): Promise<TransferOrder> {
    return {
      id: transferId,
      orderId: `order_${transferId}`,
      amount: 0,
      currency: 'TRY',
      status: 'confirmed',
      confirmedBy,
      notes,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Reject bank transfer (admin action)
   */
  async rejectTransfer(transferId: string, confirmedBy: string, reason: string): Promise<TransferOrder> {
    return {
      id: transferId,
      orderId: `order_${transferId}`,
      amount: 0,
      currency: 'TRY',
      status: 'rejected',
      confirmedBy,
      notes: reason,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
}

export default new BankTransferService();