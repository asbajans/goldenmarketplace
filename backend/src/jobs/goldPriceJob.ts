
import Queue from 'bull';

/**
 * GoldPriceJob — DISABLED (Manual Mode)
 *
 * Gold price is now set manually by the admin via the admin panel.
 * When the admin saves the gold price, product prices are updated immediately
 * and marketplace sync is triggered automatically.
 *
 * The hourly cron is no longer needed.
 */
export const goldPriceQueue = process.env.REDIS_URL
    ? new Queue('gold-price-updates', process.env.REDIS_URL)
    : new Queue('gold-price-updates', {
        redis: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD
        }
    });

export const initGoldPriceJob = async () => {
    // Remove any previously scheduled repeatable jobs
    const jobs = await goldPriceQueue.getRepeatableJobs();
    for (const job of jobs) {
        await goldPriceQueue.removeRepeatableByKey(job.key);
    }
    console.log('[GoldPriceJob] Hourly cron disabled — gold price is now set manually via admin panel.');
};

export default goldPriceQueue;
