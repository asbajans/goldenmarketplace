/**
 * Stripe Subscription Service
 * Handle payment processing and subscription management
 */

import dotenv from 'dotenv';

dotenv.config();

// eslint-disable-next-line @typescript-eslint/no-var-requires
const StripeLib = require('stripe');
const stripe = new StripeLib(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16'
}) as InstanceType<typeof StripeLib>;

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
    } catch (error: any) {
      if (error.type === 'StripeAuthenticationError') {
        console.warn('Stripe API Key is invalid. Mocking customer creation.');
        return { id: 'cus_mock_' + Math.random().toString(36).substring(7) };
      }
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
  /**
   * Create a Checkout Session
   */
  async createCheckoutSession(customerId: string, priceId: string, successUrl: string, cancelUrl: string) {
    try {
      const isStripePriceId = priceId && priceId.startsWith('price_');

      if (!process.env.STRIPE_SECRET_KEY || !isStripePriceId) {
        if (!isStripePriceId) {
          console.warn(`Price ID "${priceId}" does not look like a Stripe Price ID (should start with price_). Falling back to mock or throwing error.`);
        }

        if (!process.env.STRIPE_SECRET_KEY) {
          console.log('Mocking Stripe Checkout Session (No Secret Key)');
          return {
            id: 'cs_mock_' + Math.random().toString(36).substring(7),
            url: `${successUrl}?session_id=cs_mock_${Date.now()}`
          };
        } else if (!isStripePriceId) {
          console.log('Mocking Stripe Checkout Session (Invalid Price ID format)');
          return {
            id: 'cs_mock_' + Math.random().toString(36).substring(7),
            url: `${successUrl}?session_id=cs_mock_${Date.now()}`
          };
        }
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        customer: customerId,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: successUrl + '?session_id={CHECKOUT_SESSION_ID}',
        cancel_url: cancelUrl,
      });

      return session;
    } catch (error: any) {
      if (error.type === 'StripeAuthenticationError') {
        console.warn('Stripe API Key is invalid. Falling back to mock session for development/demo.');
        return {
          id: 'cs_mock_' + Math.random().toString(36).substring(7),
          url: `${successUrl}?session_id=cs_mock_${Date.now()}`
        };
      }

      console.error('Error creating checkout session:', error);
      throw error;
    }
  }

  /**
   * Create a Payment Link for a single product (one-time payment)
   */
  async createProductPaymentLink(product: {
    name: string;
    description?: string;
    price: number;
    currency?: string;
    images?: string[];
  }, successUrl: string, cancelUrl: string) {
    try {
      if (!process.env.STRIPE_SECRET_KEY) {
        console.log('Mocking Stripe Payment Link (No Secret Key)');
        return {
          id: 'plink_mock_' + Math.random().toString(36).substring(7),
          url: `${successUrl}?payment_link=plink_mock_${Date.now()}`
        };
      }

      const price = await stripe.prices.create({
        currency: product.currency || 'try',
        unit_amount: Math.round(product.price * 100),
        product_data: {
          name: product.name,
          description: product.description,
          images: product.images?.slice(0, 1) || []
        }
      });

      const paymentLink = await stripe.paymentLinks.create({
        line_items: [{ price: price.id, quantity: 1 }],
        after_completion: {
          type: 'redirect',
          redirect: { url: successUrl }
        },
        cancel_url: cancelUrl
      });

      return paymentLink;
    } catch (error: any) {
      if (error.type === 'StripeAuthenticationError') {
        console.warn('Stripe API Key is invalid. Falling back to mock payment link.');
        return {
          id: 'plink_mock_' + Math.random().toString(36).substring(7),
          url: `${successUrl}?payment_link=plink_mock_${Date.now()}`
        };
      }
      console.error('Error creating payment link:', error);
      throw error;
    }
  }

  /**
   * Create a direct checkout session for cart items
   */
  async createDirectCheckout(items: Array<{
    name: string;
    description?: string;
    price: number;
    currency?: string;
    quantity?: number;
    images?: string[];
  }>, successUrl: string, cancelUrl: string, customerId?: string) {
    try {
      let activeStripe = stripe;
      try {
        const GlobalSetting = require('../models/GlobalSetting').default;
        const keySetting = await GlobalSetting.findOne({ where: { key: 'stripe_secret_key' } });
        if (keySetting && keySetting.value && keySetting.value.trim() !== '') {
          activeStripe = new StripeLib(keySetting.value, { apiVersion: '2023-10-16' });
        }
      } catch (dbErr) {
        console.error('Could not fetch stripe key from DB, falling back to env', dbErr);
      }

      if (!activeStripe || (!process.env.STRIPE_SECRET_KEY && activeStripe === stripe)) {
        console.log('Mocking Stripe Direct Checkout (No Secret Key in Env or DB)');
        return {
          id: 'cs_direct_mock_' + Math.random().toString(36).substring(7),
          url: `${successUrl}?session_id=cs_direct_mock_${Date.now()}`
        };
      }

      const lineItems = await Promise.all(items.map(async (item) => {
        const price = await activeStripe.prices.create({
          currency: item.currency || 'try',
          unit_amount: Math.round(item.price * 100),
          product_data: {
            name: item.name,
            description: item.description,
            images: item.images?.slice(0, 1) || []
          }
        });
        return {
          price: price.id,
          quantity: item.quantity || 1
        };
      }));

      const session = await activeStripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        customer: customerId,
        line_items: lineItems,
        success_url: successUrl + '?session_id={CHECKOUT_SESSION_ID}',
        cancel_url: cancelUrl
      });

      return session;
    } catch (error: any) {
      if (error.type === 'StripeAuthenticationError') {
        console.warn('Stripe API Key is invalid. Falling back to mock checkout.');
        return {
          id: 'cs_direct_mock_' + Math.random().toString(36).substring(7),
          url: `${successUrl}?session_id=cs_direct_mock_${Date.now()}`
        };
      }
      console.error('Error creating direct checkout:', error);
      throw error;
    }
  }
}

export default new StripeService();
