import cron from 'node-cron';
import { Op } from 'sequelize';
import IntegrationLog from '../models/IntegrationLog';

/**
 * Cleanup job that runs every day at 03:00 AM
 * Deletes IntegrationLogs older than 7 days to preserve database space.
 */
export const startLogCleanupJob = () => {
    cron.schedule('0 3 * * *', async () => {
        console.log('[LogCleanupJob] Starting cleanup of old integration logs...');
        try {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const result = await IntegrationLog.destroy({
                where: {
                    createdAt: {
                        [Op.lt]: sevenDaysAgo
                    }
                }
            });

            console.log(`[LogCleanupJob] Cleanup finished. Deleted ${result} old logs.`);
        } catch (error) {
            console.error('[LogCleanupJob] Error cleaning up logs:', error);
        }
    });
    console.log('[Scheduler] LogCleanupJob initialized. Runs daily at 03:00 AM.');
};
