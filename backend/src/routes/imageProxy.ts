import { Router, Request, Response, NextFunction } from 'express';
import axios from 'axios';
import path from 'path';

const router = Router();

const ALLOWED_DOMAINS = [
  's3.asb.web.tr',
  'api.asb.web.tr',
  'pirlantakatalogu.com',
  'www.pirlantakatalogu.com',
  'via.placeholder.com',
];

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawUrl = req.query.url as string;
    if (!rawUrl) {
      res.status(400).json({ error: 'url query parameter is required' });
      return;
    }

    let targetUrl: URL;
    try {
      targetUrl = new URL(rawUrl);
    } catch {
      res.status(400).json({ error: 'Invalid URL' });
      return;
    }

    if (!ALLOWED_DOMAINS.includes(targetUrl.hostname)) {
      res.status(403).json({ error: 'Domain not allowed' });
      return;
    }

    const ext = path.extname(targetUrl.pathname).toLowerCase();
    if (ext && !ALLOWED_EXTENSIONS.includes(ext)) {
      res.status(400).json({ error: 'File type not allowed' });
      return;
    }

    const response = await axios.get(rawUrl, {
      responseType: 'stream',
      timeout: 15000,
      maxRedirects: 3,
    });

    const contentType = response.headers['content-type'];
    if (contentType && !contentType.startsWith('image/')) {
      res.status(400).json({ error: 'URL does not point to an image' });
      return;
    }

    let contentLength = parseInt(response.headers['content-length'] || '0', 10);
    if (contentLength > MAX_FILE_SIZE) {
      res.status(413).json({ error: 'Image too large' });
      return;
    }

    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }

    let transferred = 0;
    response.data.on('data', (chunk: Buffer) => {
      transferred += chunk.length;
      if (transferred > MAX_FILE_SIZE) {
        response.data.destroy();
        if (!res.headersSent) {
          res.status(413).json({ error: 'Image too large' });
        }
      }
    });

    response.data.pipe(res);
  } catch (error: any) {
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      res.status(502).json({ error: 'Failed to fetch image' });
      return;
    }
    if (error.response?.status) {
      res.status(error.response.status).json({ error: 'Upstream error' });
      return;
    }
    next(error);
  }
});

export default router;
