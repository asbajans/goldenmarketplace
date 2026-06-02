/**
 * Feed Sync Job
 * Bull queue worker for periodic external feed synchronization
 */
import Bull from 'bull';
import feedService from '../services/feedService';
import ExternalFeed from '../models/ExternalFeed';
import { Op } from 'sequelize';

const feedSyncQueue = new Bull('feed-sync', process.env.REDIS_URL || 'redis://localhost:6379', {
  defaultJobOptions: { removeOnComplete: 100, removeOnFail: 50 }
});

// Process feed sync jobs
feedSyncQueue.process(async (job) => {
  const { feedId } = job.data;
  if (!feedId) throw new Error('feedId is required');

  console.log(`[FeedSyncJob] Starting sync for feed ${feedId}`);
  const result = await feedService.syncFeed(feedId);
  console.log(`[FeedSyncJob] Completed sync for feed ${feedId}: ${JSON.stringify(result)}`);
  return result;
});

/**
 * Enqueue a feed sync job
 */
export async function triggerFeedSync(feedId: string) {
  await feedSyncQueue.add(
    { feedId },
    {
      attempts: 2,
      backoff: { type: 'exponential', delay: 10000 }
    }
  );
}

/**
 * Check for feeds due for auto-sync and enqueue them
 */
export async function checkAutoSyncFeeds() {
  const now = new Date();

  const feeds = await ExternalFeed.findAll({
    where: { isActive: true, autoSync: true, updateInterval: { [Op.ne]: 'manual' } }
  });

  for (const feed of feeds) {
    if (!feed.lastSyncAt) {
      await triggerFeedSync(feed.id);
      continue;
    }

    const diffMs = now.getTime() - new Date(feed.lastSyncAt).getTime();
    let intervalMs = 0;

    switch (feed.updateInterval) {
      case 'hourly': intervalMs = 60 * 60 * 1000; break;
      case 'daily': intervalMs = 24 * 60 * 60 * 1000; break;
      case 'weekly': intervalMs = 7 * 24 * 60 * 60 * 1000; break;
    }

    if (intervalMs > 0 && diffMs >= intervalMs) {
      await triggerFeedSync(feed.id);
    }
  }
}

/**
 * Schedule periodic check (runs every 30 minutes)
 */
export function startFeedSyncScheduler() {
  setInterval(async () => {
    try {
      await checkAutoSyncFeeds();
    } catch (err) {
      console.error('[FeedSyncJob] Auto-sync check error:', err);
    }
  }, 30 * 60 * 1000);

  console.log('[FeedSyncJob] Auto-sync scheduler started (30min interval)');
}

export { feedSyncQueue };
export default feedSyncQueue;
