
import { Request, Response } from 'express';
import goldPriceService from '../services/goldPriceService';

export class GoldPriceController {
    static async getCurrentPrice(_req: Request, res: Response) {
        try {
            const price = await goldPriceService.getCurrentGoldPrice();
            return res.status(200).json(price);
        } catch (error) {
            return res.status(500).json({ error: 'Failed to fetch gold price' });
        }
    }
}
