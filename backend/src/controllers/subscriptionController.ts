
import { Request, Response } from 'express';
import stripeService from '../services/stripeService';
import User from '../models/User';
import SubscriptionPlan from '../models/SubscriptionPlan';

export class SubscriptionController {
    /**
     * Get all active subscription plans
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
     * Create Checkout Session
     */
    static async createCheckoutSession(req: Request, res: Response) {
        try {
            const { priceId } = req.body;
            const userId = (req as any).user?.id;

            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const user = await User.findByPk(userId);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            // Create Stripe Customer if not exists
            let customerId = user.stripeCustomerId;
            if (!customerId) {
                if (!process.env.STRIPE_SECRET_KEY) {
                    customerId = 'cus_mock_' + userId;
                } else {
                    const customer = await stripeService.createCustomer(user.email, `${user.firstName} ${user.lastName}`);
                    customerId = customer.id;
                }

                await user.update({ stripeCustomerId: customerId });
            }

            const successUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/seller/subscription/success`;
            const cancelUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/seller/subscription/cancel`;

            const session = await stripeService.createCheckoutSession(customerId, priceId, successUrl, cancelUrl);
            return res.status(200).json({ url: session.url });

        } catch (error: any) {
            console.error('Checkout error detail:', {
                message: error.message,
                stack: error.stack,
                userId: (req as any).user?.id,
                priceId: req.body.priceId
            });

            // If it's a Stripe error, return a 400 with the message
            if (error.type?.startsWith('Stripe')) {
                return res.status(400).json({
                    error: `Stripe Error: ${error.message}`
                });
            }

            return res.status(500).json({ error: 'Failed to create checkout session: ' + error.message });
        }
    }

    /**
     * Test Implementation to Manually Activate Subscription (Helpers for Demo)
     */
    static async mockActivate(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id;
            const { plan } = req.body;

            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const user = await User.findByPk(userId);
            if (user) {
                await user.update({
                    subscriptionStatus: 'active',
                    subscriptionPlan: plan || 'Gold'
                });
                return res.json({ success: true, user });
            }
            return res.status(404).json({ error: 'User not found' });
        } catch (error) {
            return res.status(500).json({ error: 'Failed to activate' });
        }
    }
}
