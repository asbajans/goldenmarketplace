import { AxiosInstance } from 'axios';
import IntegrationLog from '../models/IntegrationLog';

/**
 * Attaches request and response interceptors to an Axios instance
 * to automatically log API requests to the IntegrationLog table.
 */
export function attachApiLogger(client: AxiosInstance, userId: string | undefined, platform: string) {
    client.interceptors.request.use(config => {
        (config as any).metadata = { startTime: new Date() };
        return config;
    });

    client.interceptors.response.use(
        async (response) => {
            try {
                let requestPayload = null;
                if (response.config.data) {
                    try {
                        requestPayload = JSON.parse(response.config.data);
                    } catch (e) {
                         requestPayload = response.config.data;
                    }
                }

                await IntegrationLog.create({
                    userId,
                    platform,
                    endpoint: response.config.url || '',
                    requestMethod: response.config.method?.toUpperCase() || '',
                    requestPayload,
                    responseStatus: response.status,
                    responsePayload: response.data,
                    isSuccess: true
                });
            } catch (err) {
                console.error(`[ApiLogger] Failed to save log for ${platform}:`, err);
            }
            return response;
        },
        async (error) => {
            try {
                 let requestPayload = null;
                 if (error.config?.data) {
                     try {
                         requestPayload = JSON.parse(error.config.data);
                     } catch (e) {
                          requestPayload = error.config.data;
                     }
                 }

                 await IntegrationLog.create({
                     userId,
                     platform,
                     endpoint: error.config?.url || '',
                     requestMethod: error.config?.method?.toUpperCase() || '',
                     requestPayload,
                     responseStatus: error.response?.status,
                     responsePayload: error.response?.data,
                     isSuccess: false,
                     errorMessage: error.message
                 });
            } catch (err) {
                 console.error(`[ApiLogger] Failed to save error log for ${platform}:`, err);
            }
            return Promise.reject(error);
        }
    );
}
