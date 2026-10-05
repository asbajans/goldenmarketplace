import { Request, Response } from 'express';
import { GlobalSetting } from '../models/GlobalSetting';

const PUBLIC_PREFIXES = [
    'facebook_',
    'google_',
    'tiktok_',
    'instagram_',
    'meta_',
    'homepage_',
    'about_',
    'blog_',
    'footer_',
    'feed_',
    'merchant_',
    // Payment method visibility flags (values are safe to expose; secrets stay private)
    'payment_',
    'credit_card_',
    'bank_',
    'stripe_publishable_key',
    // NOTE: 'stripe_secret_key', 'iyzico_*' and 'paytr_*' are intentionally
    // NOT public — they must never leak to the storefront.
];

// Google Merchant feed defaults (GlobalSetting keys)
export const FEED_DEFAULT_KEYS = {
    gender: 'feed_default_gender',
    ageGroup: 'feed_default_age_group',
    color: 'feed_default_color'
} as const;

export const FEED_GENDERS = ['male', 'female', 'unisex'] as const;
export const FEED_AGE_GROUPS = ['newborn', 'infant', 'toddler', 'kids', 'adult'] as const;

export const FEED_FALLBACKS = {
    gender: 'unisex',
    ageGroup: 'adult',
    color: 'Gold'
};

function isPublicKey(key: string): boolean {
    return PUBLIC_PREFIXES.some(prefix => key.startsWith(prefix));
}

export class SettingsController {
    /**
     * Get all public settings (or all settings if admin)
     */
    static async getSettings(req: Request, res: Response) {
        try {
            // NOTE: JWT payload carries `userType` (see utils/jwt.ts), older
            // clients may send `role`. Accept both so admins always see all keys.
            // @ts-ignore
            const userRole = (req as any).user?.role ?? (req as any).user?.userType;
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

                    if (existing) {
                        // Preserve the existing visibility flag. Recomputing it
                        // here used to flip payment keys (payment_*, bank_*,
                        // stripe_*, ...) to private on every admin save, which
                        // hid them from the storefront AND the admin panel.
                        // Only ever upgrade to public for known-public keys —
                        // never downgrade (keeps secrets private).
                        const isPublic = existing.isPublic || isPublicKey(key);
                        await existing.update({ value, ...(isPublic !== existing.isPublic ? { isPublic } : {}) });
                    } else {
                        await GlobalSetting.create({
                            key,
                            value,
                            isPublic: isPublicKey(key)
                        });
                    }
                }
            }

            // Blog posts changed -> submit article URLs to IndexNow instantly
            // (fire-and-forget; never blocks the admin save).
            try {
                if (typeof settingsToUpdate['blog_posts'] === 'string') {
                    const posts = JSON.parse(settingsToUpdate['blog_posts']);
                    if (Array.isArray(posts)) {
                        const ids = posts
                            .filter((p: any) => p && p.isActive !== false && p.id !== undefined)
                            .map((p: any) => p.id);
                        if (ids.length > 0) {
                            const { submitUrlsAsync, blogPostUrls } = require('../services/indexNowService');
                            submitUrlsAsync(ids.flatMap((id: any) => blogPostUrls(id)));
                        }
                    }
                }
            } catch (indexErr) {
                console.error('IndexNow blog submit warning:', indexErr);
            }

            // Feed varsayılanı değiştiyse, değeri boş olan eski ürünlere yansıt
            // (NULL alanlar fiziksel olarak da doldurulur; feed ayrıca fallback uygular)
            try {
                const { FEED_DEFAULT_KEYS: KEYS } = { FEED_DEFAULT_KEYS };
                const backfillMap: Record<string, string> = {};
                if (typeof settingsToUpdate[KEYS.gender] === 'string') backfillMap.gender = String(settingsToUpdate[KEYS.gender]).trim().toLowerCase();
                if (typeof settingsToUpdate[KEYS.ageGroup] === 'string') backfillMap.ageGroup = String(settingsToUpdate[KEYS.ageGroup]).trim().toLowerCase();
                if (typeof settingsToUpdate[KEYS.color] === 'string') backfillMap.color = String(settingsToUpdate[KEYS.color]).trim();
                const validGender = FEED_GENDERS.includes(backfillMap.gender as any) ? backfillMap.gender : undefined;
                const validAge = FEED_AGE_GROUPS.includes(backfillMap.ageGroup as any) ? backfillMap.ageGroup : undefined;
                const validColor = backfillMap.color ? backfillMap.color : undefined;
                if (validGender || validAge || validColor) {
                    const { default: Product } = require('../models/Product');
                    const { Op } = require('sequelize');
                    const orConds: any[] = [];
                    if (validGender) orConds.push({ gender: { [Op.or]: [null, ''] } });
                    if (validAge) orConds.push({ ageGroup: { [Op.or]: [null, ''] } });
                    if (validColor) orConds.push({ color: { [Op.or]: [null, ''] } });
                    const candidates = await Product.findAll({ where: { [Op.or]: orConds }, attributes: ['id', 'gender', 'ageGroup', 'color'] });
                    let touched = 0;
                    for (const p of candidates) {
                        const patch: any = {};
                        if (validGender && !p.gender) patch.gender = validGender;
                        if (validAge && !p.ageGroup) patch.ageGroup = validAge;
                        if (validColor && !p.color) patch.color = validColor;
                        if (Object.keys(patch).length > 0) {
                            await p.update(patch);
                            touched++;
                        }
                    }
                    return res.json({ success: true, message: 'Settings updated successfully', backfilledProducts: touched });
                }
            } catch (backfillErr) {
                console.error('Feed defaults backfill warning:', backfillErr);
            }

            return res.json({ success: true, message: 'Settings updated successfully' });
        } catch (error) {
            console.error('Error updating settings:', error);
            return res.status(500).json({ error: 'Failed to update settings' });
        }
    }
}
