
import Queue from 'bull';
import goldPriceService from '../services/goldPriceService';

// Create a queue for gold price updates
export const goldPriceQueue = process.env.REDIS_URL
    ? new Queue('gold-price-updates', process.env.REDIS_URL)
    : new Queue('gold-price-updates', {
        redis: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD
        }
    });

// Process the job
goldPriceQueue.process(async (_job) => {
    console.log('[GoldPriceJob] Processing hourly price update...');
    try {
        const result = await goldPriceService.updateProductPrices();
        console.log(`[GoldPriceJob] Done. Updated ${result.updatedCount} products. 24K Gram: ${result.goldPrice.pricePerGramTRY} TRY`);
    } catch (error) {
        console.error('[GoldPriceJob] Failed:', error);
        throw error;
    }
});

// Function to initialize the cron job
export const initGoldPriceJob = async () => {
    // Remove existing repeatable jobs to avoid duplicates on restart
    const jobs = await goldPriceQueue.getRepeatableJobs();
    for (const job of jobs) {
        await goldPriceQueue.removeRepeatableByKey(job.key);
    }

    // Every hour at minute 0
    await goldPriceQueue.add({}, {
        repeat: {
            cron: '0 * * * *' // Every hour
        }
    });

    console.log('[GoldPriceJob] Scheduled: Every hour (0 * * * *)');
};

export default goldPriceQueue;
