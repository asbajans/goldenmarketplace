import { Request, Response } from 'express';
import User from '../models/User';
import SubscriptionPlan from '../models/SubscriptionPlan';
import Payment from '../models/Payment';
import planAccessService from '../services/planAccessService';
import { createSubscriptionCheckout, verifyStripeSession, getPaymentConfig } from '../services/paymentService';

export class SubscriptionController {
    /**
     * Get all active subscription plans (public for sellers)
     */
    static async getPlans(_req: Request, res: Response) {
        try {
            const plans = await SubscriptionPlan.findAll({
                where: { isActive: true },
                order: [['monthlyPrice', 'ASC']]
            });
            return res.status(200).json(plans);
        } catch (error) {
            console.error('Fetch plans error:', error);
            return res.status(500).json({ error: 'Failed to fetch plans' });
        }
    }

    /**
     * Satıcının mevcut aboneliği + modül limitleri + ödeme yöntemi durumu
     */
    static async mySubscription(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id;
            if (!userId) return res.status(401).json({ error: 'Unauthorized' });

            const user = await User.findByPk(userId);
            if (!user) return res.status(404).json({ error: 'User not found' });

            const limits = await planAccessService.getModuleLimits(userId);
            const config = await getPaymentConfig();
            const pending = await Payment.findAll({
                where: { userId, status: 'pending' },
                order: [['createdAt', 'DESC']],
                limit: 5
            });

            return res.status(200).json({
                subscriptionPlan: user.subscriptionPlan || null,
                subscriptionStatus: user.subscriptionStatus || 'inactive',
                subscriptionEndDate: user.subscriptionEndDate || null,
                limits,
                paymentMethods: {
                    bankEnabled: config.bankEnabled,
                    cardEnabled: config.cardEnabled,
                    provider: config.provider,
                    bank: config.bank
                },
                pendingPayments: pending
            });
        } catch (error: any) {
            return res.status(500).json({ error: error.message || 'Failed to fetch subscription' });
        }
    }

    /**
     * Ödeme geçmişi (satıcı)
     */
    static async myPayments(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id;
            if (!userId) return res.status(401).json({ error: 'Unauthorized' });

            const payments = await Payment.findAll({
                where: { userId },
                order: [['createdAt', 'DESC']],
                limit: 50
            });
            return res.status(200).json(payments);
        } catch (error: any) {
            return res.status(500).json({ error: error.message || 'Failed to fetch payments' });
        }
    }

    /**
     * Checkout: paket + dönem + yöntem seçilir, PENDING ödeme oluşur.
     * - bank → havale bilgileri + bekleyen talep (admin onayı gerekli)
     * - stripe → Stripe checkout URL (ödeme Stripe'ta alınır, aktivasyon
     *   webhook/verify ile ÖDEME DOĞRULANINCA yapılır)
     * Ödeme alınmadan paket ASLA aktifleşmez.
     */
    static async checkout(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id;
            if (!userId) return res.status(401).json({ error: 'Unauthorized' });

            const { planId, billingPeriod = 'monthly', provider = 'bank' } = req.body;
            if (!planId) return res.status(400).json({ error: 'planId gerekli' });
            if (!['monthly', 'yearly'].includes(billingPeriod)) {
                return res.status(400).json({ error: 'billingPeriod monthly|yearly olmalı' });
            }
            if (!['stripe', 'bank'].includes(provider)) {
                return res.status(400).json({ error: 'provider stripe|bank olmalı' });
            }

            const { payment, url, bank } = await createSubscriptionCheckout(userId, planId, billingPeriod, provider);
            return res.status(200).json({
                paymentId: payment.id,
                status: payment.status,
                amount: payment.amount,
                currency: payment.currency,
                url,
                bank: bank || undefined,
                message: url
                    ? 'Ödeme sayfasına yönlendiriliyorsunuz'
                    : 'Talebiniz alındı. Havale/EFT sonrası admin onayıyla paketiniz aktifleşecek.'
            });
        } catch (error: any) {
            return res.status(400).json({ error: error.message || 'Checkout başlatılamadı' });
        }
    }

    /**
     * Stripe success dönüşü: session gerçekten ödenmiş mi doğrula,
     * ödenmişse aktive et. Ödenmemişse 402 döner.
     */
    static async verifySession(req: Request, res: Response) {
        try {
            const { session_id } = req.query as { session_id?: string };
            if (!session_id) return res.status(400).json({ error: 'session_id gerekli' });

            const result = await verifyStripeSession(String(session_id));
            if (!result.paid) {
                return res.status(402).json({ paid: false, status: result.payment.status, stripeStatus: result.stripeStatus });
            }
            return res.status(200).json({ paid: true, payment: result.payment });
        } catch (error: any) {
            return res.status(400).json({ error: error.message || 'Doğrulama başarısız' });
        }
    }

    /**
     * LEGACY: stripePriceId tabanlı eski checkout — yeni `checkout`
     * kullanılmalı. Geriye dönük uyumluluk için tutulur ama mock URL
     * üretmez; Stripe yapılandırılmamışsa 400 döner.
     */
    static async createCheckoutSession(req: Request, res: Response) {
        try {
            const { priceId } = req.body;
            const userId = (req as any).user?.id;

            if (!userId) return res.status(401).json({ error: 'Unauthorized' });
            if (!priceId) return res.status(400).json({ error: 'priceId gerekli' });

            const plan = await SubscriptionPlan.findOne({
                where: { stripePriceId: priceId }
            });
            if (!plan) {
                return res.status(400).json({
                    error: 'Bu fiyat için paket bulunamadı. Lütfen paket listesinden seçim yapın.'
                });
            }
            const { payment, url } = await createSubscriptionCheckout(userId, plan.id, 'monthly', 'stripe');
            return res.status(200).json({ url, paymentId: payment.id });
        } catch (error: any) {
            return res.status(400).json({ error: error.message || 'Failed to create checkout session' });
        }
    }
}
