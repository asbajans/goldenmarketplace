import { Router, Request, Response } from 'express';
import Category from '../models/Category';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
    try {
        const categories = await Category.findAll({
            where: { isActive: true },
            order: [['name', 'ASC']]
        });
        return res.json(categories);
    } catch (error) {
        console.error('Failed to fetch categories:', error);
        return res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

export default router;
