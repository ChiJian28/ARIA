import { Worker, Job } from 'bullmq';
import { runSentinelScan } from '../../agents/sentinel';
import { createWorker } from '../queue';
import logger from '../../utils/logger';

export function startSentinelWorker(): Worker {
  const worker = createWorker(
    'sentinel-scan',
    async (job: Job) => {
      logger.info('Running sentinel scan job', { jobId: job.id });
      const result = await runSentinelScan();
      return result;
    },
    { concurrency: 1 },
  );

  worker.on('completed', (job, result) => {
    logger.info('Sentinel scan complete', {
      jobId: job.id,
      scanned: result.scanned,
      alerts: result.alerts,
      liquidations: result.liquidations,
    });
  });

  worker.on('failed', (job, err) => {
    logger.error('Sentinel scan failed', { jobId: job?.id, error: err.message });
  });

  logger.info('Sentinel worker started');
  return worker;
}
