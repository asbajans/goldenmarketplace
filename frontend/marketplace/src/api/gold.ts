
import client from './client';

export interface GoldPriceData {
    price: number;
    currency: string;
    timestamp: string;
    change24h: number;
}

export const getGoldPrice = async (): Promise<GoldPriceData> => {
    const response = await client.get('/gold-price/current');
    return response.data;
};
