import client from './client';

export interface SubscriptionPlan {
    id: string;
    name: string;
    description?: string;
    monthlyPrice: number;
    yearlyPrice: number;
    currency: string;
    productLimit: number;
    integrationLimit: number;
    aiTranslationEnabled?: boolean;
    aiContentEnabled?: boolean;
    aiMonthlyCredit?: number;
    b2bEnabled?: boolean;
    bulkUploadEnabled?: boolean;
    maxExternalFeeds?: number;
    features?: string[];
    isActive: boolean;
}

export const getSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
    const response = await client.get('/subscriptions/plans');
    const data = response.data;
    return Array.isArray(data) ? data : [];
};
