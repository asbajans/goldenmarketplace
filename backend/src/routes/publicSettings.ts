import { Router, Request, Response } from 'express';
import { GlobalSetting } from '../models/GlobalSetting';

const router = Router();

/**
 * GET /api/settings/public
 * Public endpoint for settings that are marked as public. No auth required.
 */
router.get('/public', async (_req: Request, res: Response) => {
    try {
        const settings = await GlobalSetting.findAll({
            where: { isPublic: true }
        });

        const filtered = settings.reduce((acc, s) => {
            acc[s.key] = s.value;
            return acc;
        }, {} as Record<string, string>);

        return res.json(filtered);
    } catch (error) {
        console.error('Error fetching public settings:', error);
        return res.json({});
    }
});

export default router;