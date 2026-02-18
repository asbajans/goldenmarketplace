
import Queue from 'bull';
import goldPriceService from '../services/goldPriceService';

// Create a queue for gold price updates
// Redis connection is handled by Bull defaults (localhost:6379)
const goldPriceQueue = new Queue('gold-price-updates', {
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
    }
});

// Process the job
goldPriceQueue.process(async (_job) => {
    console.log('Processing gold price update job...');
    try {
        await goldPriceService.updateProductPrices();
        console.log('Gold price update completed successfully.');
    } catch (error) {
        console.error('Gold price update failed:', error);
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

    // Add a new repeatable job (every 1 minute for demo purposes, usually 1 hour)
    await goldPriceQueue.add({}, {
        repeat: {
            cron: '* * * * *' // Every minute
        }
    });

    console.log('Gold Price Job scheduled: Every 1 minute');
};

export default goldPriceQueue;
