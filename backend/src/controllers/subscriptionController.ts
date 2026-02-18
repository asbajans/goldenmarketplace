
import { Request, Response } from 'express';
import stripeService from '../services/stripeService';
import User from '../models/User';

export class SubscriptionController {
    /**
     * Create Checkout Session
     */
    static async createCheckoutSession(req: Request, res: Response) {
        try {
            const { priceId } = req.body;
            // @ts-ignore
            const userId = req.user.id; // User added by auth middleware

            const user = await User.findByPk(userId);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            // Create Stripe Customer if not exists
            let customerId = user.stripeCustomerId;
            if (!customerId) {
                // Mock or Real
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

        } catch (error) {
            console.error('Checkout error:', error);
            return res.status(500).json({ error: 'Failed to create checkout session' });
        }
    }

    /**
     * Test Implementation to Manually Activate Subscription (Helpers for Demo)
     */
    static async mockActivate(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userId = req.user.id;
            const { plan } = req.body;

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
