import { Router, Request, Response } from 'express';
import Category from '../models/Category';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
    try {
        const { lang = 'en' } = req.query;
        const language = String(lang).toLowerCase();

        const categories = await Category.findAll({
            where: { isActive: true },
            order: [['name', 'ASC']]
        });

        // Apply language translation
        const localizedCategories = categories.map((cat: any) => {
            const trans = cat.translations || {};
            const translation = trans[language] || {};

            return {
                ...cat.toJSON(),
                name: translation.name || cat.name,
                description: translation.description || cat.description,
                _translatedLanguage: language
            };
        });

        return res.json(localizedCategories);
    } catch (error) {
        console.error('Failed to fetch categories:', error);
        return res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

export default router;