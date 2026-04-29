import { Request, Response } from 'express';
import integrationService from '../services/integrationService';
import crypto from 'crypto';
import NodeCache from 'node-cache';
import { GlobalSetting } from '../models/GlobalSetting';
import MarketplaceIntegration from '../models/MarketplaceIntegration';
import EtsyClient from '../integrations/etsy/etsyClient';

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

    /**
     * Get Etsy Shipping Profiles
     */
    static async getEtsyShippingProfiles(req: Request, res: Response) {
        try {
            const userId = (req as any).user.id;
            
            const integration = await MarketplaceIntegration.findOne({
                where: { userId, platform: 'etsy', isActive: true }
            });

            if (!integration || !integration.accessToken || !integration.shopId) {
                return res.status(400).json({ error: 'Etsy is not connected or missing credentials' });
            }

            const client = new EtsyClient(integration);
            const response = await client.getShippingProfiles(integration.shopId, integration.accessToken);
            // Etsy returns { count, results: [...] }
            return res.json(response);
        } catch (error: any) {
            console.error('Get Etsy Shipping Profiles error:', error);
            return res.status(500).json({ error: error.message || 'Failed to fetch shipping profiles' });
        }
    }

    /**
     * Get Etsy Return Policies
     */
    static async getEtsyReturnPolicies(req: Request, res: Response) {
        try {
            const userId = (req as any).user.id;
            
            const integration = await MarketplaceIntegration.findOne({
                where: { userId, platform: 'etsy', isActive: true }
            });

            if (!integration || !integration.accessToken || !integration.shopId) {
                return res.status(400).json({ error: 'Etsy is not connected or missing credentials' });
            }

            const client = new EtsyClient(integration);
            const response = await client.getReturnPolicies(integration.shopId, integration.accessToken);
            // Etsy returns { count, results: [...] }
            return res.json(response);
        } catch (error: any) {
            console.error('Get Etsy Return Policies error:', error);
            return res.status(500).json({ error: error.message || 'Failed to fetch return policies' });
        }
    }

    /**
     * Get Etsy Readiness State Definitions
     */
    static async getEtsyReadinessStates(req: Request, res: Response) {
        try {
            const userId = (req as any).user.id;
            
            const integration = await MarketplaceIntegration.findOne({
                where: { userId, platform: 'etsy', isActive: true }
            });

            if (!integration || !integration.accessToken || !integration.shopId) {
                return res.status(400).json({ error: 'Etsy is not connected or missing credentials' });
            }

            const client = new EtsyClient(integration);
            const response = await client.getReadinessStates(integration.shopId, integration.accessToken);
            // Etsy returns { count, results: [...] }
            return res.json(response);
        } catch (error: any) {
            console.error('Get Etsy Readiness States error:', error);
            return res.status(500).json({ error: error.message || 'Failed to fetch readiness states' });
        }
    }

    /**
     * Get Etsy Seller Taxonomy Nodes
     */
    static async getEtsySellerTaxonomyNodes(_req: Request, res: Response) {
        try {
            const client = new EtsyClient();
            const response = await client.getSellerTaxonomyNodes();
            return res.json(response);
        } catch (error: any) {
            console.error('Get Etsy Seller Taxonomy Nodes error:', error);
            return res.status(500).json({ error: error.message || 'Failed to fetch seller taxonomy nodes' });
        }
    }

    static async etsyCallback(req: Request, res: Response) {
        try {
            const { code, state } = req.query;

            if (!code || !state) {
                throw new Error('Missing code or state in callback');
            }

            // Retrieve from cache
            const cachedData = pkceCache.take(state as string) as { userId: string; codeVerifier: string; etsyCategoryId?: string; etsyShippingProfileId?: string } | undefined;

            if (!cachedData) {
                throw new Error('Invalid or expired state parameter');
            }

            const { userId, codeVerifier, etsyCategoryId, etsyShippingProfileId } = cachedData;

            const apiBaseUrl = process.env.API_URL || 'https://api.asb.web.tr/api';
            const baseWithApi = apiBaseUrl.endsWith('/api') ? apiBaseUrl : `${apiBaseUrl}/api`;
            const redirectUri = `${baseWithApi}/integrations/etsy/callback`;

            await integrationService.handleEtsyCallback(userId, code as string, codeVerifier, redirectUri, etsyCategoryId, etsyShippingProfileId);

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
            
            const { categoryId, shippingProfileId } = req.query;

            // Store state -> verifier mapping in cache
            console.log('Storing PKCE inside node-cache...');
            pkceCache.set(state, { userId, codeVerifier, etsyCategoryId: categoryId, etsyShippingProfileId: shippingProfileId });

            const setting = await GlobalSetting.findOne({ where: { key: 'etsy_api_key' } });
            const clientId = setting?.value || '';

            const apiBaseUrl = process.env.API_URL || 'https://api.asb.web.tr/api';
            const baseWithApi = apiBaseUrl.endsWith('/api') ? apiBaseUrl : `${apiBaseUrl}/api`;
            const redirectUri = `${baseWithApi}/integrations/etsy/callback`;
            const scopes = 'shops_r shops_w listings_r listings_w listings_d profile_r email_r transactions_r transactions_w';

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

    /**
     * Get Etsy orders (receipts) — shows recent orders from Etsy API
     */
    static async getEtsyOrders(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id;

            const integration = await MarketplaceIntegration.findOne({
                where: { userId, platform: 'etsy', isActive: true }
            });

            if (!integration || !integration.accessToken || !integration.shopId) {
                return res.status(400).json({ error: 'Etsy bağlantısı bulunamadı' });
            }

            const client = new EtsyClient(integration);
            const data = await client.getShopReceipts(integration.shopId, integration.accessToken, {
                limit: 100,
                was_paid: true
            });

            return res.json(data);
        } catch (error: any) {
            console.error('[Etsy] getEtsyOrders error:', error.message);
            return res.status(500).json({ error: error.message });
        }
    }

    /**
     * Sync Etsy orders into the local system
     * Pulls receipts from Etsy and imports them as Orders in the database
     */
    static async syncEtsyOrders(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id;

            const Store = require('../models/Store').default;
            const { Order, OrderItem } = require('../models/Order');

            const integration = await MarketplaceIntegration.findOne({
                where: { userId, platform: 'etsy', isActive: true }
            });

            if (!integration || !integration.accessToken || !integration.shopId) {
                return res.status(400).json({ error: 'Etsy bağlantısı bulunamadı' });
            }

            const store = await Store.findOne({ where: { userId } });
            if (!store) {
                return res.status(404).json({ error: 'Mağaza bulunamadı' });
            }

            const client = new EtsyClient(integration);

            // Fetch last 100 paid receipts from Etsy
            const data = await client.getShopReceipts(integration.shopId, integration.accessToken, {
                limit: 100,
                was_paid: true
            });

            const receipts: any[] = data.results || [];
            let imported = 0;
            let updated = 0;
            let skipped = 0;
            const errors: string[] = [];

            function generateOrderNumber(): string {
                const now = new Date();
                const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
                const timePart = now.toISOString().slice(11, 19).replace(/:/g, '');
                const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
                return `GC${datePart}${timePart}${random}`;
            }

            for (const receipt of receipts) {
                const externalOrderId = String(receipt.receipt_id);

                try {
                    // Map Etsy status to internal status
                    let status = 'confirmed';
                    if (receipt.status === 'completed') status = 'delivered';
                    else if (receipt.is_shipped) status = 'shipped';

                    // Build shipping address from Etsy receipt
                    const addr = receipt.shipping_address || receipt.delivery_address || {};
                    const shippingAddress = {
                        name: `${receipt.buyer_display_name || receipt.name || 'Etsy Customer'}`,
                        address: [addr.first_line, addr.second_line].filter(Boolean).join(', '),
                        city: addr.city || '',
                        country: addr.country_iso || addr.country || 'TR',
                        phone: receipt.buyer_phone || ''
                    };

                    // Calculate real exact amounts including discounts
                    const currency = receipt.grandtotal?.currency_code || 'TRY';
                    const totalAmount = Number(receipt.grandtotal?.amount || 0) / Number(receipt.grandtotal?.divisor || 100);
                    const shippingCost = Number(receipt.total_shipping_cost?.amount || 0) / Number(receipt.total_shipping_cost?.divisor || 100);
                    const discountAmt = Number(receipt.discount_amt?.amount || 0) / Number(receipt.discount_amt?.divisor || 100);
                    const rawSubtotal = Number(receipt.subtotal?.amount || 0) / Number(receipt.subtotal?.divisor || 100);
                    
                    const subtotal = rawSubtotal - discountAmt; // Real product subtotal after discount

                    // Build order items from receipt transactions
                    const transactions: any[] = receipt.transactions || [];
                    const orderItemsData: any[] = [];

                    for (const tx of transactions) {
                        const qty = tx.quantity || 1;
                        const unitPrice = Number(tx.price?.amount || 0) / Number(tx.price?.divisor || 100);
                        const totalPrice = unitPrice * qty;

                        orderItemsData.push({
                            productId: store.id, // fallback: use storeId as placeholder
                            variantId: null,
                            title: tx.title || tx.product_data?.description || 'Etsy Ürünü',
                            sku: tx.sku || String(tx.listing_id || tx.transaction_id),
                            quantity: qty,
                            unitPrice,
                            totalPrice
                        });
                    }

                    const commissionRate = store.commissionRate || 10;
                    const commissionAmount = totalAmount * (commissionRate / 100);
                    const sellerEarnings = totalAmount - commissionAmount;

                    const existing = await Order.findOne({
                        where: { externalOrderId, source: 'etsy' }
                    });

                    if (existing) {
                        await existing.update({
                            status,
                            subtotal,
                            shippingCost,
                            totalAmount,
                            commissionRate,
                            commissionAmount,
                            sellerEarnings,
                            currency,
                            shippingAddress,
                            customerNote: receipt.message_from_buyer || ''
                        });

                        // Recreate items to ensure they are up to date
                        await OrderItem.destroy({ where: { orderId: existing.id } });
                        for (const item of orderItemsData) {
                            await OrderItem.create({ orderId: existing.id, ...item });
                        }

                        updated++;
                    } else {
                        const order = await Order.create({
                            orderNumber: generateOrderNumber(),
                            customerId: userId,   // Etsy customer not in our system → use seller as placeholder
                            sellerId: userId,
                            storeId: store.id,
                            status,
                            subtotal,
                            shippingCost,
                            totalAmount,
                            commissionRate,
                            commissionAmount,
                            sellerEarnings,
                            currency,
                            shippingTime: 3,
                            orderDate: receipt.create_timestamp ? new Date(receipt.create_timestamp * 1000) : new Date(),
                            source: 'etsy',
                            externalOrderId,
                            shippingAddress,
                            customerNote: receipt.message_from_buyer || ''
                        });

                        for (const item of orderItemsData) {
                            await OrderItem.create({ orderId: order.id, ...item });
                        }

                        imported++;
                    }
                } catch (err: any) {
                    errors.push(`Receipt ${externalOrderId}: ${err.message}`);
                }
            }

            return res.json({
                success: true,
                total: receipts.length,
                imported,
                updated,
                skipped,
                errors
            });
        } catch (error: any) {
            console.error('[Etsy] syncEtsyOrders error:', error.message);
            return res.status(500).json({ error: error.message });
        }
    }
}
