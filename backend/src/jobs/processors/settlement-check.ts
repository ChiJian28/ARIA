import { Worker, Job } from 'bullmq';
import { rwaRepo } from '../../db/repositories/rwa.repo';
import { getAgentConfigs } from '../../config/agents';
import { settleMaturedRwa } from '../../services/vault/settlement';
import { createWorker } from '../queue';
import logger from '../../utils/logger';

export function startSettlementWorker(): Worker {
  const worker = createWorker(
    'settlement-check',
    async (job: Job) => {
      logger.info('Running settlement check', { jobId: job.id });

      const activePositions = await rwaRepo.listActive();
      const now = new Date();
      let processed = 0;

      const orchestratorKeyPath = getAgentConfigs().find((c) => c.id === 'orchestrator')?.keyPath ?? '';

      for (const submission of activePositions) {
        if (submission.dueDate <= now) {
          logger.info('Processing matured instrument', { rwa_id: submission.id });

          try {
            await settleMaturedRwa(submission, orchestratorKeyPath);
            processed++;
          } catch (err) {
            logger.error('Settlement processing failed', {
              rwa_id: submission.id,
              error: (err as Error).message,
            });
          }
        }
      }

      logger.info('Settlement check complete', { processed, checked: activePositions.length });
      return { processed, checked: activePositions.length };
    },
    { concurrency: 1 },
  );

  worker.on('failed', (job, err) => {
    logger.error('Settlement worker error', { jobId: job?.id, error: err.message });
  });

  logger.info('Settlement worker started');
  return worker;
}
