import { Request, Response } from 'express';
import integrationService from '../services/integrationService';
import crypto from 'crypto';
import NodeCache from 'node-cache';
import { GlobalSetting } from '../models/GlobalSetting';

// Cache for short-lived state/verifier lookup (5 minutes TTL)
const pkceCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

export class IntegrationController {
    static async getIntegrations(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userId = req.user.id;
            const integrations = await integrationService.getUserIntegrations(userId);
            res.json(integrations);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch integrations' });
        }
    }

    static async connect(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userId = req.user.id;
            const integration = await integrationService.connectPlatform(userId, req.body);
            res.status(201).json(integration);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }

    static async disconnect(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userId = req.user.id;
            const { platform } = req.params;
            await integrationService.disconnectPlatform(userId, platform);
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: 'Failed to disconnect' });
        }
    }

    static async testConnection(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userId = req.user.id;
            const { platform } = req.params;
            const result = await integrationService.testConnection(userId, platform);
            res.json({ success: true, result });
        } catch (error: any) {
            console.error('Test Connection Error:', error);
            res.status(400).json({ error: error.message || 'Connection test failed' });
        }
    }

    static async etsyCallback(req: Request, res: Response) {
        try {
            const { code, state } = req.query;

            if (!code || !state) {
                throw new Error('Missing code or state in callback');
            }

            // Retrieve from cache
            const cachedData = pkceCache.take(state as string) as { userId: string; codeVerifier: string } | undefined;

            if (!cachedData) {
                throw new Error('Invalid or expired state parameter');
            }

            const { userId, codeVerifier } = cachedData;

            // Reconstruct redirectUri because we need it to be identical to what was sent during AuthUrl request
            const redirectUri = `${process.env.API_URL || 'http://localhost:777/api'}/integrations/etsy/callback`;

            await integrationService.handleEtsyCallback(userId, code as string, codeVerifier, redirectUri);

            // Redirect back to frontend
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            res.redirect(`${frontendUrl}/seller/integrations?status=success&platform=etsy`);
        } catch (error) {
            console.error('Etsy Callback Error:', error);
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            res.redirect(`${frontendUrl}/seller/integrations?status=error&platform=etsy`);
        }
    }

    /**
     * Generate Etsy Auth URL
     */
    static async getEtsyAuthUrl(req: Request, res: Response) {
        try {
            console.log('Generating Etsy Auth URL...');

            // @ts-ignore
            const userId = req.user?.id;

            if (!userId) {
                console.error('Etsy Auth URL Error: Missing user ID in request context');
                return res.status(401).json({ error: 'Unauthorized: User ID missing' });
            }

            // Generate PKCE
            console.log('Generating PKCE challenges...');
            const codeVerifier = crypto.randomBytes(32).toString('base64url');
            const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
            const state = crypto.randomBytes(16).toString('hex');

            // Store state -> verifier mapping in cache
            console.log('Storing PKCE inside node-cache...');
            pkceCache.set(state, { userId, codeVerifier });

            const setting = await GlobalSetting.findOne({ where: { key: 'etsy_api_key' } });
            const clientId = setting?.value || '';

            const apiBaseUrl = process.env.API_URL || 'https://api.goldencrafters.com/api';
            const redirectUri = `${apiBaseUrl}/integrations/etsy/callback`;
            const scopes = 'listings_r listings_w listings_d profile_r email_r transactions_r transactions_w';

            if (!clientId) {
                console.error('Etsy Auth URL Error: ETSY_KEY is empty in Database');
                return res.status(500).json({ error: 'Etsy is not configured on the server (Missing etsy_api_key in Settings)' });
            }

            console.log('Redirect URI configured as:', redirectUri);

            const url = `https://www.etsy.com/oauth/connect?response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&client_id=${clientId}&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=S256`;

            console.log('Returning Etsy Auth URL to frontend:', url);
            return res.json({ url });
        } catch (error: any) {
            console.error('Etsy Auth URL Generation Exception:', error?.message || error);
            console.error(error.stack);
            return res.status(500).json({ error: 'Failed to generate auth url: ' + (error?.message || 'Unknown server error') });
        }
    }
}
