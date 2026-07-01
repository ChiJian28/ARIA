import cron from 'node-cron';
import { getSettlementQueue } from '../queue';
import { config } from '../../config';
import logger from '../../utils/logger';

let settlementCron: cron.ScheduledTask | null = null;

export function startSettlementScheduler(): void {
  if (settlementCron) {
    logger.warn('Settlement scheduler already running');
    return;
  }

  logger.info('Starting settlement scheduler', { cron: config.SETTLEMENT_CRON });

  settlementCron = cron.schedule(config.SETTLEMENT_CRON, async () => {
    try {
      const queue = getSettlementQueue();
      await queue.add('settlement-check', {}, {
        jobId: `settlement-${Date.now()}`,
      });
      logger.info('Settlement check job enqueued');
    } catch (err) {
      logger.error('Failed to enqueue settlement check', { error: (err as Error).message });
    }
  });
}

export function stopSettlementScheduler(): void {
  if (settlementCron) {
    settlementCron.stop();
    settlementCron = null;
    logger.info('Settlement scheduler stopped');
  }
}
