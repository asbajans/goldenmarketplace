
import client from './client';

export interface GoldPriceData {
    pricePerGramTRY: number;
    pricePerOzTRY: number;
    usdTryRate: number;
    timestamp: string;
    source: string;
}

export const getGoldPrice = async (): Promise<GoldPriceData> => {
    const response = await client.get('/gold-price/current');
    return response.data;
};
