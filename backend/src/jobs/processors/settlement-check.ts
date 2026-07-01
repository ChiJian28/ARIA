import { Worker, Job } from 'bullmq';
import { rwaRepo } from '../../db/repositories/rwa.repo';
import { vaultRepo } from '../../db/repositories/vault.repo';
import { processRepayment } from '../../blockchain/contracts/settlement-engine';
import { getAgentConfigs } from '../../config/agents';
import { scoreAgentReputationsForRwa } from '../../services/agents/reputation';
import { createWorker } from '../queue';
import { sseEmitter } from '../../api/sse/emitter';
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
            const amountMotes = Math.floor(submission.faceValue * 1_000_000_000).toString();

            const result = await processRepayment(
              submission.id,
              amountMotes,
              orchestratorKeyPath,
            );

            await rwaRepo.updateStatus(submission.id, 'SETTLED');
            await vaultRepo.recordSettlementEvent({
              rwaId: submission.id,
              eventType: 'MATURITY',
              amount: amountMotes,
              txHash: result.deployHash,
            });

            await scoreAgentReputationsForRwa(submission.id, 'success');

            sseEmitter.emit('VAULT_EVENT', {
              type: 'VAULT_EVENT',
              rwaId: submission.id,
              data: {
                eventType: 'MATURITY',
                amount: amountMotes,
                txHash: result.deployHash,
              },
              timestamp: new Date().toISOString(),
            });

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
