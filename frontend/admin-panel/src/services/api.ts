import axios from 'axios';

const getBaseURL = () => {
    // 1. Check for local development hostnames first
    const isLocalHostname =
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname.includes('local') ||
        window.location.hostname.startsWith('192.168.');

    // 2. Determine if we should use the local proxy
    if (import.meta.env.DEV || isLocalHostname) {
        console.log('[API] Using local development proxy (/api)');
        return '/api';
    }

    // 3. Environment variable override
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
    if (import.meta.env.VITE_API_BASE_URL) return import.meta.env.VITE_API_BASE_URL;

    // 4. Production fallback
    console.warn('[API] Falling back to production URL');
    return 'https://api.goldencrafters.com/api';
};

const API_URL = getBaseURL();

const api = axios.create({
    baseURL: `${API_URL}/admin`,
    timeout: 10000,
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            // We don't have a login redirect yet, but clearing the token is a start
            // and we could trigger a reload or show a global error
            console.warn('Session expired or unauthorized. Clearing token.');
        }
        return Promise.reject(error);
    }
);

export const AdminAPI = {
    // Users
    getUsers: () => api.get('/users').then((res) => res.data),
    createUser: (data: any) => api.post('/users', data).then((res) => res.data),
    updateUser: (id: string, data: any) => api.put(`/users/${id}`, data).then((res) => res.data),
    deleteUser: (id: string) => api.delete(`/users/${id}`).then((res) => res.data),

    // Stores
    getStores: () => api.get('/stores').then((res) => res.data),
    createStore: (data: any) => api.post('/stores', data).then((res) => res.data),
    updateStore: (id: string, data: any) => api.put(`/stores/${id}`, data).then((res) => res.data),
    deleteStore: (id: string) => api.delete(`/stores/${id}`).then((res) => res.data),

    // Categories
    getCategories: () => api.get('/categories').then((res) => res.data),
    createCategory: (data: any) => api.post('/categories', data).then((res) => res.data),
    updateCategory: (id: string, data: any) => api.put(`/categories/${id}`, data).then((res) => res.data),
    deleteCategory: (id: string) => api.delete(`/categories/${id}`).then((res) => res.data),

    // Subscription Plans
    getSubscriptionPlans: () => api.get('/subscription-plans').then((res) => res.data),
    createSubscriptionPlan: (data: any) => api.post('/subscription-plans', data).then((res) => res.data),
    updateSubscriptionPlan: (id: string, data: any) => api.put(`/subscription-plans/${id}`, data).then((res) => res.data),
    deleteSubscriptionPlan: (id: string) => api.delete(`/subscription-plans/${id}`).then((res) => res.data),
    // Integrations
    getIntegrations: () => api.get('/integrations').then((res) => res.data),

};

export default api;
