import client from './client';

export const login = async (email: string, password: string) => {
    const response = await client.post('/auth/login', { email, password });
    if (response.data.accessToken) {
        localStorage.setItem('token', response.data.accessToken);
        localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
};

export const register = async (userData: any) => {
    const response = await client.post('/auth/register', userData);
    return response.data;
};

export const getCurrentUser = async () => {
    const response = await client.get('/auth/me');
    return response.data;
};

export const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
};
