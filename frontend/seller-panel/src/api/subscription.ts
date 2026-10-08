import client from './client';

export const getSubscriptionPlans = async () => {
    const response = await client.get('/subscriptions/plans');
    return response.data;
};

export const getMySubscription = async () => {
    const response = await client.get('/subscriptions/me');
    return response.data;
};

export const getMyPayments = async () => {
    const response = await client.get('/subscriptions/my-payments');
    return response.data;
};

export const checkoutSubscription = async (planId: string, billingPeriod: 'monthly' | 'yearly', provider: 'stripe' | 'bank') => {
    const response = await client.post('/subscriptions/checkout', { planId, billingPeriod, provider });
    return response.data;
};

export const verifyCheckoutSession = async (sessionId: string) => {
    const response = await client.get('/subscriptions/verify-session', { params: { session_id: sessionId } });
    return response.data;
};

// LEGACY: eski stripePriceId tabanlı akış (mock üretmez)
export const createCheckoutSession = async (priceId: string, planName: string) => {
    const response = await client.post('/subscriptions/create-checkout-session', { priceId, planName });
    return response.data;
};
