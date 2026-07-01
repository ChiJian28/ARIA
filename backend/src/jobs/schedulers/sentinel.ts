import cron from 'node-cron';
import { getSentinelQueue } from '../queue';
import { config } from '../../config';
import logger from '../../utils/logger';

let sentinelCron: cron.ScheduledTask | null = null;

export function startSentinelScheduler(): void {
  if (sentinelCron) {
    logger.warn('Sentinel scheduler already running');
    return;
  }

  logger.info('Starting sentinel scheduler', { cron: config.SENTINEL_CRON });

  sentinelCron = cron.schedule(config.SENTINEL_CRON, async () => {
    try {
      const queue = getSentinelQueue();
      await queue.add('sentinel-scan', {}, {
        jobId: `sentinel-${Date.now()}`,
      });
      logger.info('Sentinel scan job enqueued');
    } catch (err) {
      logger.error('Failed to enqueue sentinel scan', { error: (err as Error).message });
    }
  });
}

export function stopSentinelScheduler(): void {
  if (sentinelCron) {
    sentinelCron.stop();
    sentinelCron = null;
    logger.info('Sentinel scheduler stopped');
  }
}
