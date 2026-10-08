/**
 * Stripe Webhooks
 * NOT: imza doğrulaması için ham body gerekir; bu router server.ts'te
 * express.json()'tan ÖNCE express.raw ile mount edilir.
 */
import { Router, Request, Response } from 'express';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const StripeLib = require('stripe');

import GlobalSetting from '../models/GlobalSetting';
import { fulfillByProviderRef } from '../services/paymentService';

const router = Router();

router.post('/stripe', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  if (!sig) return res.status(400).send('Missing signature');

  try {
    const secretRow = await GlobalSetting.findOne({ where: { key: 'stripe_secret_key' } });
    const secret = secretRow?.value || process.env.STRIPE_SECRET_KEY || '';
    const webhookSecretRow = await GlobalSetting.findOne({ where: { key: 'stripe_webhook_secret' } });
    const webhookSecret = webhookSecretRow?.value || process.env.STRIPE_WEBHOOK_SECRET || '';
    if (!secret || !webhookSecret) {
      return res.status(500).send('Webhook not configured');
    }

    const stripe = new StripeLib(secret, { apiVersion: '2023-10-16' });
    const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;
      if (session.payment_status === 'paid') {
        try {
          await fulfillByProviderRef(session.id);
        } catch (fulfillErr: any) {
          // Kayıt bulunamazsa logla, Stripe'e 500 dönüp retry al
          console.error('[Webhook] Fulfill failed:', fulfillErr?.message);
          return res.status(500).send('Fulfill failed');
        }
      }
    }

    return res.json({ received: true });
  } catch (err: any) {
    console.error('[Webhook] Signature verification failed:', err?.message);
    return res.status(400).send(`Webhook Error: ${err?.message}`);
  }
});

export default router;
