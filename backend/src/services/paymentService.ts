/**
 * Payment Service
 * Abonelik paketi ve AI kredi satışlarının tek doğruluk kaynağı.
 *
 * KURAL: Ödeme doğrulanmadan paket/kredi ASLA aktifleştirilmez.
 *  - Stripe: checkout.session.completed webhook'u veya success-verify
 *    (session retrieve + payment_status === 'paid') ile doğrulanır.
 *  - Havale/EFT: admin onayıyla (pending → paid) aktifleşir.
 * Mock ile otomatik aktivasyon YOKTUR.
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const StripeLib = require('stripe');

import GlobalSetting from '../models/GlobalSetting';
import User from '../models/User';
import SubscriptionPlan from '../models/SubscriptionPlan';
import Payment from '../models/Payment';
import CreditTransaction from '../models/CreditTransaction';
import planAccessService from './planAccessService';

export interface CreditPack {
  credits: number;
  price: number;
}

export function parseCreditPacks(raw: unknown): CreditPack[] {
  try {
    const val = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(val)) return [];
    return val
      .filter((p: any) => Number(p?.credits) > 0 && Number(p?.price) >= 0)
      .map((p: any) => ({ credits: Number(p.credits), price: Number(p.price) }));
  } catch {
    return [];
  }
}

export async function getCreditPacks(): Promise<CreditPack[]> {
  const row = await GlobalSetting.findOne({ where: { key: 'ai_credit_packs' } });
  if (!row?.value) return [];
  return parseCreditPacks(row.value);
}

async function getSetting(key: string): Promise<string> {
  const row = await GlobalSetting.findOne({ where: { key } });
  return row?.value || '';
}

function getStripe() {
  return (async () => {
    const secret = (await getSetting('stripe_secret_key')) || process.env.STRIPE_SECRET_KEY || '';
    if (!secret) return null;
    return new StripeLib(secret, { apiVersion: '2023-10-16' });
  })();
}

export async function getPaymentConfig() {
  const [bankEnabled, cardEnabled, provider, bankName, bankIban, bankAccount, bankSwift, bankBranch] = await Promise.all([
    getSetting('payment_bank_transfer_enabled'),
    getSetting('payment_credit_card_enabled'),
    getSetting('credit_card_provider'),
    getSetting('bank_name'),
    getSetting('bank_iban'),
    getSetting('bank_account_name'),
    getSetting('bank_swift'),
    getSetting('bank_branch')
  ]);
  return {
    bankEnabled: bankEnabled !== 'false',
    cardEnabled: cardEnabled === 'true',
    provider: provider || 'none',
    bank: { name: bankName, iban: bankIban, accountName: bankAccount, swift: bankSwift, branch: bankBranch }
  };
}

function sellerBaseUrl(): string {
  return process.env.FRONTEND_URL || 'http://localhost:5173';
}

async function ensureStripeCustomer(user: User, stripe: any): Promise<string> {
  if (user.stripeCustomerId && !String(user.stripeCustomerId).startsWith('cus_mock')) {
    return user.stripeCustomerId;
  }
  const customer = await stripe.customers.create({
    email: user.email,
    name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
    metadata: { userId: user.id }
  });
  await user.update({ stripeCustomerId: customer.id });
  return customer.id;
}

// ─── Subscription checkout ──────────────────────────────────────────

export async function createSubscriptionCheckout(
  userId: string,
  planId: string,
  billingPeriod: 'monthly' | 'yearly',
  provider: 'stripe' | 'bank'
) {
  const user = await User.findByPk(userId);
  if (!user) throw new Error('Kullanıcı bulunamadı');

  const plan = await SubscriptionPlan.findByPk(planId);
  if (!plan || !plan.isActive) throw new Error('Paket bulunamadı veya pasif');

  const amount = billingPeriod === 'yearly' ? Number(plan.yearlyPrice) : Number(plan.monthlyPrice);
  if (!amount || amount <= 0) throw new Error('Paket fiyatı tanımlı değil');

  const config = await getPaymentConfig();

  const payment = await Payment.create({
    userId,
    kind: 'subscription',
    status: 'pending',
    planId: plan.id,
    billingPeriod,
    amount,
    currency: plan.currency || 'USD',
    provider
  } as any);

  if (provider === 'bank') {
    if (!config.bankEnabled) {
      await payment.update({ status: 'cancelled' });
      throw new Error('Havale/EFT ödemesi şu an kapalı');
    }
    return { payment, url: null as string | null, bank: config.bank };
  }

  // provider === 'stripe'
  if (!config.cardEnabled || config.provider !== 'stripe') {
    await payment.update({ status: 'cancelled' });
    throw new Error('Kart ödemesi şu an kapalı. Havale/EFT ile devam edin.');
  }
  const stripe = await getStripe();
  if (!stripe) {
    await payment.update({ status: 'cancelled' });
    throw new Error('Stripe anahtarı tanımlı değil. Havale/EFT ile devam edin.');
  }
  const priceId = billingPeriod === 'yearly' ? (plan as any).stripePriceIdYearly : plan.stripePriceId;
  if (!priceId || !String(priceId).startsWith('price_')) {
    await payment.update({ status: 'cancelled' });
    throw new Error(`Bu paket için ${billingPeriod === 'yearly' ? 'yıllık' : 'aylık'} Stripe fiyatı tanımlı değil. Havale/EFT ile devam edin.`);
  }

  const customerId = await ensureStripeCustomer(user, stripe);
  const base = sellerBaseUrl();
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { paymentId: payment.id, userId, kind: 'subscription', planId: plan.id, billingPeriod },
    success_url: `${base}/seller/subscription/success?session_id={CHECKOUT_SESSION_ID}&kind=subscription`,
    cancel_url: `${base}/seller/subscription?cancelled=1`
  });

  await payment.update({ providerRef: session.id, metadata: { ...(payment.metadata || {}), stripeSessionUrl: session.url } });
  return { payment, url: session.url as string, bank: null };
}

// ─── Credit checkout ────────────────────────────────────────────────

export async function createCreditCheckout(
  userId: string,
  credits: number,
  provider: 'stripe' | 'bank'
) {
  const user = await User.findByPk(userId);
  if (!user) throw new Error('Kullanıcı bulunamadı');

  // Fiyat istemciden DEĞİL, adminin tanımladığı paket listesinden gelir.
  const packs = await getCreditPacks();
  const pack = packs.find(p => p.credits === Number(credits));
  if (!pack) throw new Error('Bu kredi paketi tanımlı değil');

  const config = await getPaymentConfig();

  const payment = await Payment.create({
    userId,
    kind: 'credit',
    status: 'pending',
    credits: pack.credits,
    amount: pack.price,
    currency: 'USD',
    provider
  } as any);

  if (provider === 'bank') {
    if (!config.bankEnabled) {
      await payment.update({ status: 'cancelled' });
      throw new Error('Havale/EFT ödemesi şu an kapalı');
    }
    return { payment, url: null as string | null, bank: config.bank };
  }

  if (!config.cardEnabled || config.provider !== 'stripe') {
    await payment.update({ status: 'cancelled' });
    throw new Error('Kart ödemesi şu an kapalı. Havale/EFT ile devam edin.');
  }
  const stripe = await getStripe();
  if (!stripe) {
    await payment.update({ status: 'cancelled' });
    throw new Error('Stripe anahtarı tanımlı değil. Havale/EFT ile devam edin.');
  }

  const customerId = await ensureStripeCustomer(user, stripe);
  const base = sellerBaseUrl();
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    customer: customerId,
    line_items: [{
      price_data: {
        currency: 'usd',
        unit_amount: Math.round(pack.price * 100),
        product_data: { name: `${pack.credits} AI Kredisi` }
      },
      quantity: 1
    }],
    metadata: { paymentId: payment.id, userId, kind: 'credit', credits: String(pack.credits) },
    success_url: `${base}/seller/subscription/success?session_id={CHECKOUT_SESSION_ID}&kind=credit`,
    cancel_url: `${base}/seller/credits?cancelled=1`
  });

  await payment.update({ providerRef: session.id, metadata: { ...(payment.metadata || {}), stripeSessionUrl: session.url } });
  return { payment, url: session.url as string, bank: null };
}

// ─── Fulfillment (tek yerden) ───────────────────────────────────────

async function fulfillPayment(payment: Payment): Promise<Payment> {
  if (payment.status === 'paid') return payment;

  if (payment.kind === 'subscription') {
    const plan = await SubscriptionPlan.findByPk(payment.planId as string);
    if (!plan) throw new Error('Paket bulunamadı');
    const user = await User.findByPk(payment.userId);
    if (!user) throw new Error('Kullanıcı bulunamadı');

    const days = payment.billingPeriod === 'yearly' ? 365 : 30;
    const base = user.subscriptionEndDate && new Date(user.subscriptionEndDate).getTime() > Date.now()
      ? new Date(user.subscriptionEndDate)
      : new Date();
    base.setDate(base.getDate() + days);

    await user.update({
      subscriptionPlan: plan.name,
      subscriptionStatus: 'active',
      subscriptionEndDate: base
    } as any);
  } else {
    await planAccessService.addPurchasedCredits(payment.userId, Number(payment.credits));
    const buyer = await User.findByPk(payment.userId);
    await CreditTransaction.create({
      userId: payment.userId,
      amount: Number(payment.credits),
      type: 'purchase',
      reason: `Kredi satın alımı (${payment.provider})`,
      balanceAfter: buyer?.aiCreditBalance ?? null,
      refId: payment.id
    } as any);
  }

  await payment.update({ status: 'paid', paidAt: new Date() });
  return payment;
}

/** Stripe success sayfası /verify için: session gerçekten ödenmiş mi? */
export async function verifyStripeSession(sessionId: string) {
  const stripe = await getStripe();
  if (!stripe) throw new Error('Stripe yapılandırılmamış');
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (!session) throw new Error('Oturum bulunamadı');

  const paymentId = session.metadata?.paymentId;
  if (!paymentId) throw new Error('Ödeme kaydı eşleşmedi');
  const payment = await Payment.findByPk(paymentId);
  if (!payment) throw new Error('Ödeme kaydı bulunamadı');

  if (session.payment_status === 'paid') {
    await fulfillPayment(payment);
    return { paid: true as const, payment };
  }
  return { paid: false as const, payment, stripeStatus: session.payment_status };
}

/** Stripe webhook checkout.session.completed için. */
export async function fulfillByProviderRef(providerRef: string) {
  const payment = await Payment.findOne({ where: { providerRef } });
  if (!payment) throw new Error('Ödeme kaydı bulunamadı');
  return fulfillPayment(payment);
}

// ─── Admin işlemleri ────────────────────────────────────────────────

export async function approvePayment(paymentId: string, adminId: string) {
  const payment = await Payment.findByPk(paymentId);
  if (!payment) throw new Error('Ödeme bulunamadı');
  if (payment.status === 'paid') return payment;
  if (payment.status !== 'pending') throw new Error(`Bu ödeme onaylanamaz (durum: ${payment.status})`);
  await payment.update({ provider: payment.provider === 'stripe' ? 'stripe' : payment.provider, metadata: { ...(payment.metadata || {}), approvedBy: adminId } });
  return fulfillPayment(payment);
}

export async function rejectPayment(paymentId: string, adminId: string, reason?: string) {
  const payment = await Payment.findByPk(paymentId);
  if (!payment) throw new Error('Ödeme bulunamadı');
  if (payment.status !== 'pending') throw new Error(`Bu ödeme reddedilemez (durum: ${payment.status})`);
  await payment.update({ status: 'rejected', metadata: { ...(payment.metadata || {}), rejectedBy: adminId, rejectReason: reason || '' } });
  return payment;
}

/** Admin manuel kredi tanımlama (haricen). */
export async function grantCreditsByAdmin(userId: string, credits: number, reason: string, adminId: string) {
  if (!Number.isInteger(Number(credits)) || Number(credits) <= 0) {
    throw new Error('Kredi adedi pozitif tam sayı olmalı');
  }
  const user = await User.findByPk(userId);
  if (!user) throw new Error('Kullanıcı bulunamadı');
  await planAccessService.addPurchasedCredits(userId, Number(credits));
  const updated = await User.findByPk(userId);
  const tx = await CreditTransaction.create({
    userId,
    amount: Number(credits),
    type: 'admin_grant',
    reason: reason || 'Admin tarafından tanımlandı',
    balanceAfter: updated?.aiCreditBalance ?? null,
    createdBy: adminId
  } as any);

  // Denetim için manual ödeme kaydı da düşülür (tutar 0).
  await Payment.create({
    userId,
    kind: 'credit',
    status: 'paid',
    credits: Number(credits),
    amount: 0,
    currency: 'USD',
    provider: 'manual',
    metadata: { reason: reason || '', grantedBy: adminId, transactionId: tx.id },
    paidAt: new Date()
  } as any);

  return { balance: updated?.aiCreditBalance ?? 0, transaction: tx };
}
