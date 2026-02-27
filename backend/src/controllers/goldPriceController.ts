
import { Request, Response } from 'express';
import goldPriceService from '../services/goldPriceService';

export class GoldPriceController {
    /**
     * Get current 24K gold price per gram in TRY + USD/TRY rate
     */
    static async getCurrentPrice(_req: Request, res: Response) {
        try {
            const price = await goldPriceService.getCurrentGoldPrice();
            return res.status(200).json(price);
        } catch (error) {
            return res.status(500).json({ error: 'Failed to fetch gold price' });
        }
    }

    /**
     * Calculate product price preview from gramWeight + milyem
     */
    static async calculatePrice(req: Request, res: Response) {
        try {
            const { gramWeight, milyem } = req.body;
            if (!gramWeight || !milyem) {
                return res.status(400).json({ error: 'gramWeight and milyem are required' });
            }

            const gold = await goldPriceService.getCurrentGoldPrice();
            const { priceTRY, priceUSD } = await goldPriceService.calculateProductPrice(
                Number(gramWeight), Number(milyem)
            );

            return res.status(200).json({
                gramWeight: Number(gramWeight),
                milyem: Number(milyem),
                gold24KGramTRY: gold.pricePerGramTRY,
                usdTryRate: gold.usdTryRate,
                priceTRY,
                priceUSD
            });
        } catch (error) {
            return res.status(500).json({ error: 'Failed to calculate price' });
        }
    }
}
