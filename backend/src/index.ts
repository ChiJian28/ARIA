import 'dotenv/config';
import { getConfig } from './config';
import { createServer } from './api/server';
import { runMigrations, closePool } from './db';
import { startRwaPipelineWorker } from './jobs/processors/rwa-pipeline';
import { startSentinelWorker } from './jobs/processors/sentinel-scan';
import { startSettlementWorker } from './jobs/processors/settlement-check';
import { startSentinelScheduler, stopSentinelScheduler } from './jobs/schedulers/sentinel';
import { startSettlementScheduler, stopSettlementScheduler } from './jobs/schedulers/settlement';
import { startCasperEventListener, stopCasperEventListener } from './blockchain/queries/events';
import { initMcpConnections } from './agents/base/mcp-client';
import { closeQueues } from './jobs/queue';
import logger from './utils/logger';

async function main(): Promise<void> {
  const config = getConfig();

  logger.info('ARIA Backend starting', {
    env: config.NODE_ENV,
    port: config.PORT,
    casperNode: config.CASPER_NODE_URL,
    geminiModel: config.GEMINI_MODEL,
  });

  // 1. Database migrations
  await runMigrations();

  // 2. MCP connections
  await initMcpConnections();

  // 3. Start BullMQ workers
  const rwaWorker = startRwaPipelineWorker();
  const sentinelWorker = startSentinelWorker();
  const settlementWorker = startSettlementWorker();

  // 4. Start cron schedulers
  startSentinelScheduler();
  startSettlementScheduler();

  // 5. Start Casper node SSE listener
  try {
    startCasperEventListener();
  } catch (err) {
    logger.warn('Casper SSE listener failed to start', { error: (err as Error).message });
  }

  // 6. Start HTTP server
  const app = createServer();
  const server = app.listen(config.PORT, () => {
    logger.info(`ARIA Backend listening on port ${config.PORT}`, {
      env: config.NODE_ENV,
      health: `http://localhost:${config.PORT}/api/health`,
      sse: `http://localhost:${config.PORT}/api/sse/events`,
    });
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully`);

    server.close(() => logger.info('HTTP server closed'));

    stopCasperEventListener();
    stopSentinelScheduler();
    stopSettlementScheduler();

    await Promise.allSettled([
      rwaWorker.close(),
      sentinelWorker.close(),
      settlementWorker.close(),
    ]);

    await closeQueues();
    await closePool();

    logger.info('ARIA Backend shutdown complete');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', { error: err.message, stack: err.stack });
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', { reason: String(reason) });
  });
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
