/**
 * Stripe Subscription Service
 * Handle payment processing and subscription management
 */

import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16' as any
});

// SubscriptionPlan removed (unused) to avoid TS unused-type errors


export class StripeService {
  /**
   * Create a subscription for a seller
   */
  async createSubscription(customerId: string, priceId: string) {
    try {
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent']
      });

      return subscription;
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw error;
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(subscriptionId: string) {
    try {
      const subscription = await (stripe.subscriptions as any).del(subscriptionId);
      return subscription;
    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw error;
    }
  }

  /**
   * Get subscription details
   */
  async getSubscription(subscriptionId: string) {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      return subscription;
    } catch (error) {
      console.error('Error retrieving subscription:', error);
      throw error;
    }
  }

  /**
   * Create a customer
   */
  async createCustomer(email: string, name: string, metadata: Record<string, string> = {}) {
    try {
      const customer = await stripe.customers.create({
        email,
        name,
        metadata
      });

      return customer;
    } catch (error) {
      console.error('Error creating customer:', error);
      throw error;
    }
  }

  /**
   * Create a payment intent for one-time purchases
   */
  async createPaymentIntent(amount: number, currency: string, customerId: string, description: string) {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency,
        customer: customerId,
        description,
        automatic_payment_methods: {
          enabled: true
        }
      });

      return paymentIntent;
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw error;
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(body: string, signature: string, webhookSecret: string) {
    try {
      const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      return event;
    } catch (error) {
      console.error('Error verifying webhook:', error);
      throw error;
    }
  }
}

export default new StripeService();
