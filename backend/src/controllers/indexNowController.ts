import { Request, Response } from 'express';
import { getIndexNowConfig, submitUrls } from '../services/indexNowService';

/**
 * Admin-only IndexNow controls (mounted under /api/admin).
 */
export class IndexNowController {
  static async getStatus(_req: Request, res: Response) {
    try {
      const cfg = await getIndexNowConfig();
      return res.json({
        enabled: cfg.enabled,
        keyConfigured: cfg.key.length > 0,
        keyLocation: cfg.keyLocation || null,
        endpoint: 'https://api.indexnow.org/indexnow'
      });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to read IndexNow status' });
    }
  }

  static async submit(req: Request, res: Response) {
    try {
      const { urls } = req.body || {};
      if (!Array.isArray(urls) || urls.length === 0) {
        return res.status(400).json({ error: 'Provide { urls: string[] }' });
      }
      const result = await submitUrls(urls);
      return res.json({ success: result.ok, ...result });
    } catch (error: any) {
      return res.status(500).json({ error: 'IndexNow submit failed' });
    }
  }
}
