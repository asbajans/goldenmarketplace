
import { Request, Response } from 'express';
import goldPriceService from '../services/goldPriceService';

export class GoldPriceController {
    /**
     * Get current 24K gold price per gram in TRY
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
     * Set manual gold price (admin only)
     * Body: { pricePerGramTRY: number }
     */
    static async setGoldPrice(req: Request, res: Response) {
        try {
            const { pricePerGramTRY } = req.body;
            if (!pricePerGramTRY || isNaN(Number(pricePerGramTRY)) || Number(pricePerGramTRY) <= 0) {
                return res.status(400).json({ error: 'Geçersiz fiyat. Pozitif bir sayı girin.' });
            }
            const result = await goldPriceService.setManualGoldPrice(Number(pricePerGramTRY));
            return res.status(200).json({
                message: `Altın fiyatı güncellendi: ${pricePerGramTRY} TRY/gram. ${result.updatedCount} ürün fiyatı güncellendi. Pazaryeri senkronizasyonu başlatıldı.`,
                updatedCount: result.updatedCount,
                goldPrice: result.goldPrice
            });
        } catch (error: any) {
            return res.status(400).json({ error: error.message || 'Altın fiyatı kaydedilemedi' });
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
                priceTRY,
                priceUSD
            });
        } catch (error) {
            return res.status(500).json({ error: 'Failed to calculate price' });
        }
    }

    /**
     * Force refresh — reads latest manual price from DB
     */
    static async forceRefresh(_req: Request, res: Response) {
        try {
            const price = await goldPriceService.forceRefresh();
            return res.status(200).json({ message: 'Price refreshed from DB', ...price });
        } catch (error) {
            return res.status(500).json({ error: 'Failed to refresh gold price' });
        }
    }
}
