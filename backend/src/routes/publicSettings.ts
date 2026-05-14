import { Router, Request, Response } from 'express';
import { GlobalSetting } from '../models/GlobalSetting';

const router = Router();

const PUBLIC_PREFIXES = ['facebook_', 'google_', 'tiktok_', 'instagram_', 'meta_'];

/**
 * GET /api/settings/public
 * Public endpoint for tracking/pixel settings. No auth required.
 */
router.get('/public', async (_req: Request, res: Response) => {
    try {
        const settings = await GlobalSetting.findAll({
            where: { isPublic: true }
        });

        // Filter to only return tracking-related keys
        const filtered = settings.reduce((acc, s) => {
            if (PUBLIC_PREFIXES.some(prefix => s.key.startsWith(prefix))) {
                acc[s.key] = s.value;
            }
            return acc;
        }, {} as Record<string, string>);

        return res.json(filtered);
    } catch (error) {
        console.error('Error fetching public settings:', error);
        return res.json({});
    }
});

export default router;