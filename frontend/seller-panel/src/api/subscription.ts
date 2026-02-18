
import client from './client';

export const createCheckoutSession = async (priceId: string, planName: string) => {
    const response = await client.post('/subscriptions/create-checkout-session', { priceId, planName });
    return response.data;
};

export const mockActivateSubscription = async (plan: string) => {
    const response = await client.post('/subscriptions/mock-activate', { plan });
    return response.data;
}
