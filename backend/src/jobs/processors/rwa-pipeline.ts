import { Worker, Job } from 'bullmq';
import { rwaRepo } from '../../db/repositories/rwa.repo';
import { agentRepo } from '../../db/repositories/agent.repo';
import { runRwaPipeline } from '../../agents/orchestrator';
import { createWorker } from '../queue';
import logger from '../../utils/logger';

interface RwaPipelineJob {
  submissionId: string;
}

export function startRwaPipelineWorker(): Worker {
  const worker = createWorker(
    'rwa-pipeline',
    async (job: Job<RwaPipelineJob>) => {
      const { submissionId } = job.data;
      logger.info('Processing RWA pipeline job', { rwa_id: submissionId, jobId: job.id });

      const submission = await rwaRepo.findById(submissionId);
      if (!submission) {
        throw new Error(`Submission not found: ${submissionId}`);
      }

      if (submission.status !== 'PENDING' && submission.status !== 'ANALYZING') {
        logger.warn('Submission already processed, skipping', {
          rwa_id: submissionId,
          status: submission.status,
        });
        return { skipped: true, status: submission.status };
      }

      const result = await runRwaPipeline(submission);

      logger.info('RWA pipeline job complete', {
        rwa_id: submissionId,
        approved: result.approved,
        processingTimeMs: result.processingTimeMs,
        totalCostMotes: result.totalCostMotes,
      });

      return result;
    },
    { concurrency: 3 },
  );

  worker.on('completed', (job) => {
    logger.info('RWA pipeline job completed', { jobId: job.id, rwa_id: job.data.submissionId });
  });

  worker.on('failed', async (job, err) => {
    logger.error('RWA pipeline job failed', {
      jobId: job?.id,
      rwa_id: job?.data?.submissionId,
      error: err.message,
    });

    const submissionId = job?.data?.submissionId;
    if (!submissionId) return;

    try {
      const submission = await rwaRepo.findById(submissionId);
      const votes = await agentRepo.getVotesByRwa(submissionId);
      const approveCount = votes.filter((v) => v.vote === 'APPROVE').length;
      const councilApproved = approveCount >= 3;

      // Don't overwrite council approval when only post-approval steps (e.g. mint) failed
      if (councilApproved || submission?.status === 'APPROVED') {
        await rwaRepo.updateStatus(submissionId, 'APPROVED', {
          finalDecisionMemo: `Council approved · pipeline step failed: ${err.message}`,
        });
        return;
      }

      await rwaRepo.updateStatus(submissionId, 'REJECTED', {
        finalDecisionMemo: `Pipeline failed: ${err.message}`,
      });
    } catch {
      // ignore secondary failure
    }
  });

  logger.info('RWA pipeline worker started');
  return worker;
}
