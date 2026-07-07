import { Queue, Worker } from 'bullmq';
import { config } from '../config';
import logger from '../utils/logger';
import { urlHostnameBelongsTo } from '../utils/url-host';

/** Fresh plain-object options per Queue/Worker (never share one object across instances) */
function createRedisConnection() {
  const raw = config.REDIS_URL;
  const isUpstash = urlHostnameBelongsTo(raw, 'upstash.io');

  try {
    const parsed = new URL(raw);
    const useTls = parsed.protocol === 'rediss:';

    return {
      host: parsed.hostname,
      port: parsed.port ? Number(parsed.port) : 6379,
      username: decodeURIComponent(parsed.username || 'default'),
      password: decodeURIComponent(parsed.password),
      ...(useTls ? { tls: {} } : {}),
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      ...(isUpstash ? {} : {}),
    };
  } catch {
    return {
      url: raw,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      ...(raw.startsWith('rediss://') ? { tls: {} } : {}),
    };
  }
}

let rwaQueue: Queue | null = null;
let sentinelQueue: Queue | null = null;
let settlementQueue: Queue | null = null;

export function getRwaQueue(): Queue {
  if (!rwaQueue) {
    rwaQueue = new Queue('rwa-pipeline', {
      connection: createRedisConnection(),
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
      connection: createRedisConnection(),
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
      connection: createRedisConnection(),
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
  const worker = new Worker<T, R>(name, processor, {
    connection: createRedisConnection(),
    concurrency: options?.concurrency ?? 1,
  });
  worker.on('error', (err) => {
    logger.error('BullMQ worker error', { queue: name, error: err.message });
  });
  return worker;
}

export async function closeQueues(): Promise<void> {
  await Promise.allSettled([
    rwaQueue?.close(),
    sentinelQueue?.close(),
    settlementQueue?.close(),
  ]);
  logger.info('All queues closed');
}
