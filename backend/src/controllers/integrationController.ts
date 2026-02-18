
import { Request, Response } from 'express';
import integrationService from '../services/integrationService';

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

    static async etsyCallback(req: Request, res: Response) {
        try {
            const { code, state } = req.query;
            const { userId, codeVerifier } = JSON.parse(Buffer.from(state as string, 'base64').toString());

            // In a real app, verify the state matching the user session to prevent CSRF

            await integrationService.handleEtsyCallback(userId, code as string, codeVerifier);

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
            // @ts-ignore
            const userId = req.user.id;

            // Mocking PKCE
            const codeVerifier = 'mock_verifier_' + Date.now();
            const state = Buffer.from(JSON.stringify({ userId, codeVerifier })).toString('base64');
            const clientId = process.env.ETSY_KEY || 'mock_client_id';
            const redirectUri = `${process.env.API_URL || 'http://localhost:777/api'}/integrations/etsy/callback`;
            const scopes = 'listings_r listings_w';

            const url = `https://www.etsy.com/oauth/connect?response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&client_id=${clientId}&state=${state}&code_challenge=mock_challenge&code_challenge_method=S256`;

            res.json({ url });
        } catch (error) {
            res.status(500).json({ error: 'Failed to generate auth url' });
        }
    }
}
