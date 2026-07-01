import { Queue, Worker } from 'bullmq';
import { config } from '../config';
import logger from '../utils/logger';

// BullMQ bundles its own ioredis — pass connection options object, not a Redis instance
const connectionOptions = { url: config.REDIS_URL };

let rwaQueue: Queue | null = null;
let sentinelQueue: Queue | null = null;
let settlementQueue: Queue | null = null;

export function getRwaQueue(): Queue {
  if (!rwaQueue) {
    rwaQueue = new Queue('rwa-pipeline', {
      connection: connectionOptions,
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 10000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    });
  }
  return rwaQueue;
}

export function getSentinelQueue(): Queue {
  if (!sentinelQueue) {
    sentinelQueue = new Queue('sentinel-scan', {
      connection: connectionOptions,
      defaultJobOptions: {
        attempts: 1,
        removeOnComplete: 10,
        removeOnFail: 10,
      },
    });
  }
  return sentinelQueue;
}

export function getSettlementQueue(): Queue {
  if (!settlementQueue) {
    settlementQueue = new Queue('settlement-check', {
      connection: connectionOptions,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 30000 },
        removeOnComplete: 50,
        removeOnFail: 20,
      },
    });
  }
  return settlementQueue;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createWorker<T = any, R = any>(
  name: string,
  processor: (job: import('bullmq').Job<T>) => Promise<R>,
  options?: { concurrency?: number },
): Worker<T, R> {
  return new Worker<T, R>(name, processor, {
    connection: connectionOptions,
    concurrency: options?.concurrency ?? 1,
  });
}

export async function closeQueues(): Promise<void> {
  await Promise.allSettled([
    rwaQueue?.close(),
    sentinelQueue?.close(),
    settlementQueue?.close(),
  ]);
  logger.info('All queues closed');
}
