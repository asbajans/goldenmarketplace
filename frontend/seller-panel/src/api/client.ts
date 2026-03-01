import axios from 'axios';

const isProd = typeof window !== 'undefined' && window.location.hostname.includes('goldencrafters.com');
const API_URL = isProd ? 'https://api.goldencrafters.com/api' : '/api';

const client = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add a request interceptor
client.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add a response interceptor
client.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            const currentPath = window.location.pathname;
            const requestUrl = error.config?.url || '';

            // Don't redirect if already on login/register or if this was an auth check
            if (!currentPath.includes('/login') && !currentPath.includes('/register') && !requestUrl.includes('/auth/me')) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default client;
