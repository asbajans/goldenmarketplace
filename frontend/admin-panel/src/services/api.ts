import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:777/api';

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
