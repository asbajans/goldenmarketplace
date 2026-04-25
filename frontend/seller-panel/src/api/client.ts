import axios from 'axios';

const isProd = typeof window !== 'undefined' && window.location.hostname.includes('asb.web.tr');
const API_URL = isProd ? 'https://api.asb.web.tr/api' : '/api';

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

// Refresh token function
const refreshAccessToken = async (): Promise<boolean> => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return false;
    
    try {
        const response = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        if (response.data.accessToken) {
            localStorage.setItem('token', response.data.accessToken);
            if (response.data.refreshToken) {
                localStorage.setItem('refreshToken', response.data.refreshToken);
            }
            return true;
        }
    } catch (error) {
        console.error('Token refresh failed:', error);
    }
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    return false;
};

// Add a response interceptor
client.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        
        if (error.response && error.response.status === 401) {
            // Try to refresh token if not already retried
            if (!originalRequest._retry) {
                originalRequest._retry = true;
                
                const refreshed = await refreshAccessToken();
                if (refreshed) {
                    // Retry the original request
                    const token = localStorage.getItem('token');
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    return client(originalRequest);
                }
            }
            
            // If refresh failed or already retried, redirect to login
            const currentPath = window.location.pathname;
            const requestUrl = originalRequest?.url || '';
            
            if (!currentPath.includes('/login') && !currentPath.includes('/register') && !requestUrl.includes('/auth/me')) {
                localStorage.removeItem('token');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('user');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default client;
