import { Request, Response } from 'express';
import { GlobalSetting } from '../models/GlobalSetting';

const PUBLIC_PREFIXES = ['facebook_', 'google_', 'tiktok_', 'instagram_', 'meta_'];

function isPublicKey(key: string): boolean {
    return PUBLIC_PREFIXES.some(prefix => key.startsWith(prefix));
}

export class SettingsController {
    /**
     * Get all public settings (or all settings if admin)
     */
    static async getSettings(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userRole = req.user?.role;
            const isAdmin = userRole === 'admin';

            const settings = await GlobalSetting.findAll({
                where: isAdmin ? undefined : { isPublic: true }
            });

            // Map to key-value pairs for easy frontend usage
            const formattedSettings = settings.reduce((acc, current) => {
                acc[current.key] = current.value;
                return acc;
            }, {} as Record<string, string>);

            return res.json(formattedSettings);
        } catch (error) {
            console.error('Error fetching settings:', error);
            return res.status(500).json({ error: 'Failed to fetch settings' });
        }
    }

    /**
     * Update or create settings (Admin only)
     * Body should be a key-value object { "etsy_api_key": "123", "etsy_api_secret": "456" }
     */
    static async updateSettings(req: Request, res: Response) {
        try {
            const settingsToUpdate = req.body;

            if (!settingsToUpdate || typeof settingsToUpdate !== 'object') {
                return res.status(400).json({ error: 'Invalid settings format' });
            }

            // Iterate and upsert all provided keys
            for (const [key, value] of Object.entries(settingsToUpdate)) {
                if (typeof value === 'string') {
                    const existing = await GlobalSetting.findOne({ where: { key } });
                    const isPublic = isPublicKey(key);

                    if (existing) {
                        await existing.update({ value, isPublic });
                    } else {
                        await GlobalSetting.create({
                            key,
                            value,
                            isPublic
                        });
                    }
                }
            }

            return res.json({ success: true, message: 'Settings updated successfully' });
        } catch (error) {
            console.error('Error updating settings:', error);
            return res.status(500).json({ error: 'Failed to update settings' });
        }
    }
}
