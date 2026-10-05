/**
 * Checkout Service
 * Shared helpers for cart checkout & order re-payment:
 *  - payment method toggles (admin panel -> GlobalSetting)
 *  - Stripe line-item building with correct TRY->USD handling
 *
 * Background:
 *  - Admin panel toggles live in GlobalSetting:
 *      payment_bank_transfer_enabled ('true' | 'false', default true)
 *      payment_credit_card_enabled   ('true' | 'false', default false)
 *      credit_card_provider          ('none' | 'iyzico' | 'paytr' | 'stripe')
 *  - Order items store TRY prices. Stripe sessions are created in USD, so the
 *    USD price must come from Product/ProductVariant.priceUSD (discount
 *    applied). When a product has no USD price, convert the stored TRY amount
 *    with the current usd_try_rate — NEVER send the TRY number as USD.
 */

const { GlobalSetting } = require('../models/GlobalSetting');

export interface PaymentConfig {
  bankTransferEnabled: boolean;
  creditCardEnabled: boolean;
  provider: string;
}

export class PaymentMethodError extends Error {
  status = 400;
  constructor(message: string) {
    super(message);
    this.name = 'PaymentMethodError';
  }
}

export async function getPaymentConfig(): Promise<PaymentConfig> {
  const rows: any[] = await GlobalSetting.findAll({
    where: {
      key: [
        'payment_bank_transfer_enabled',
        'payment_credit_card_enabled',
        'credit_card_provider'
      ]
    }
  });
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;

  return {
    // Bank transfer defaults to ON (seed value) when the key is missing.
    bankTransferEnabled: map.payment_bank_transfer_enabled !== 'false',
    // Credit card defaults to OFF (seed value) when the key is missing.
    creditCardEnabled: map.payment_credit_card_enabled === 'true',
    provider: map.credit_card_provider || 'none'
  };
}

/**
 * Reject checkout attempts with a payment method the admin disabled.
 * This guarantees the storefront can never offer a method that is OFF
 * in Admin Panel -> Odeme Yonetimi, even if the frontend is stale/cached.
 */
export async function assertPaymentMethodAllowed(
  paymentMethod: string | undefined
): Promise<void> {
  if (!paymentMethod || paymentMethod === 'bankTransfer') {
    const cfg = await getPaymentConfig();
    if (!cfg.bankTransferEnabled) {
      throw new PaymentMethodError(
        'Banka havalesi ile odeme su anda kapali. Lutfen baska bir odeme yontemi secin.'
      );
    }
    return;
  }
  if (paymentMethod === 'stripe') {
    const cfg = await getPaymentConfig();
    if (!cfg.creditCardEnabled) {
      throw new PaymentMethodError(
        'Kredi karti ile odeme su anda kapali. Lutfen baska bir odeme yontemi secin.'
      );
    }
    if (cfg.provider !== 'stripe') {
      throw new PaymentMethodError(
        `Kredi karti odemeleri '${cfg.provider}' uzerinden aliniyor; Stripe su anda aktif saglayici degil.`
      );
    }
    return;
  }
  throw new PaymentMethodError(`Desteklenmeyen odeme yontemi: ${paymentMethod}`);
}

async function getUsdTryRate(): Promise<number> {
  try {
    const row: any = await GlobalSetting.findOne({ where: { key: 'usd_try_rate' } });
    const rate = row?.value ? parseFloat(row.value) : NaN;
    if (rate && rate > 0) return rate;
  } catch {
    // fall through to default
  }
  return 38.5;
}

export interface StripeLineItem {
  name: string;
  price: number;
  quantity: number;
  currency: string;
}

/**
 * Build Stripe (USD) line items from order items (TRY).
 * Re-reads the live Product/Variant so gold-price moves are reflected,
 * applies the product discount, and converts TRY->USD when no USD price
 * exists instead of sending TRY numbers as USD.
 */
export async function buildStripeLineItems(
  items: Array<{ title: string; quantity: number; unitPrice: number | string; productId?: string; variantId?: string }>
): Promise<{ lineItems: StripeLineItem[]; stripeTotalUSD: number }> {
  const Product = require('../models/Product').default;
  const ProductVariant = require('../models/ProductVariant').default;
  const usdTryRate = await getUsdTryRate();

  const lineItems: StripeLineItem[] = [];
  for (const item of items) {
    let usdPrice = 0;
    if ((item as any).variantId) {
      const v: any = await ProductVariant.findByPk((item as any).variantId);
      usdPrice = parseFloat(v?.priceUSD) || 0;
    }
    if (!usdPrice && item.productId) {
      const p: any = await Product.findByPk(item.productId);
      usdPrice = parseFloat(p?.priceUSD) || 0;
      const discountRate = parseFloat(p?.discountRate) || 0;
      if (discountRate > 0) {
        usdPrice = Math.round(usdPrice * (1 - discountRate / 100) * 100) / 100;
      }
    }
    if (!usdPrice) {
      // No USD price on the product (legacy record): convert the stored TRY
      // unit price with the live rate instead of charging TRY-as-USD.
      const tryPrice = parseFloat(item.unitPrice as any) || 0;
      usdPrice = Math.round((tryPrice / usdTryRate) * 100) / 100;
    }
    const qty = Number((item as any).quantity) || 1;
    lineItems.push({ name: item.title, price: usdPrice, quantity: qty, currency: 'usd' });
  }

  const stripeTotalUSD =
    Math.round(lineItems.reduce((s, li) => s + li.price * li.quantity, 0) * 100) / 100;
  return { lineItems, stripeTotalUSD };
}

export default {
  getPaymentConfig,
  assertPaymentMethodAllowed,
  buildStripeLineItems,
  PaymentMethodError
};
