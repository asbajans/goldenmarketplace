
import Queue from 'bull';
import dotenv from 'dotenv';
import MarketplaceIntegration from '../models/MarketplaceIntegration';
import Product from '../models/Product';

dotenv.config();

// Create Sync Queue
export const productSyncQueue = new Queue('product-sync', {
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379')
    }
});

// Process Jobs
productSyncQueue.process(async (job) => {
    const { productId, trigger } = job.data;
    console.log(`Processing sync for product ${productId} (Trigger: ${trigger})`);

    try {
        // 1. Fetch Product with Store/User info
        // @ts-ignore
        const product = await Product.findByPk(productId);
        if (!product) {
            console.error(`Product ${productId} not found`);
            return;
        }

        // 2. Find Owner's Integrations
        // We need to get the store, then the user
        // For now assuming we can get userId from somewhere or passed in job
        // Let's assume passed in job for simplicity or we fetch store -> user
        const userId = job.data.userId;

        if (!userId) {
            console.error(`UserId not provided for sync job ${job.id}`);
            return;
        }

        const integrations = await MarketplaceIntegration.findAll({
            where: { userId, isActive: true }
        });

        if (integrations.length === 0) {
            console.log(`No active integrations for user ${userId}`);
            return;
        }

        // 3. Push to each marketplace
        for (const integration of integrations) {
            console.log(`Syncing product ${product.id} to ${integration.platform}...`);
            try {
                switch (integration.platform) {
                    case 'etsy':
                        await syncToEtsy(integration, product);
                        break;
                    case 'amazon':
                        // await syncToAmazon(integration, product);
                        break;
                    default:
                        console.log(`Platform ${integration.platform} not yet supported`);
                }
            } catch (err) {
                console.error(`Failed to sync to ${integration.platform}`, err);
            }
        }

    } catch (error) {
        console.error('Sync Job Failed', error);
        throw error;
    }
});

// Mock Etsy Sync
async function syncToEtsy(integration: any, product: any) {
    // In reality: Authenticate with accessToken, then PUT /listings/:id
    console.log(`[Mock] Pushing "${product.title}" to Etsy Shop ${integration.shopId}`);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Update integration lastSync
    await integration.update({ lastSyncAt: new Date() });
}
