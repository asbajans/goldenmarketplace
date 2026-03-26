import axios from 'axios';

const isProd = typeof window !== 'undefined' && window.location.hostname.includes('asb.web.tr');
const API_URL = import.meta.env.VITE_API_BASE_URL || (isProd ? 'https://api.asb.web.tr/api' : 'http://localhost:777/api');

const client = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// We can add interceptors here if we implement customer login later
// For now, public access is fine.

export default client;
