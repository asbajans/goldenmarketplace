
import client from './client';

export const getSubscriptionPlans = async () => {
    const response = await client.get('/subscriptions/plans');
    return response.data;
};

export const createCheckoutSession = async (priceId: string, planName: string) => {
    const response = await client.post('/subscriptions/create-checkout-session', { priceId, planName });
    return response.data;
};

export const mockActivateSubscription = async (plan: string) => {
    const response = await client.post('/subscriptions/mock-activate', { plan });
    return response.data;
}
