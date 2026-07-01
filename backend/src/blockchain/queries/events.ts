// eslint-disable-next-line @typescript-eslint/no-require-imports
const EventSourceLib = require('eventsource') as typeof EventSource;
import { config } from '../../config';
import { sseEmitter } from '../../api/sse/emitter';
import logger from '../../utils/logger';

let casperSseMain: EventSource | null = null;
let casperSseDeploys: EventSource | null = null;

interface CasperSseEvent {
  ApiVersion?: string;
  BlockAdded?: {
    block_hash: string;
    block: { header: { height: number } };
  };
  DeployProcessed?: {
    deploy_hash: string;
    block_hash: string;
    execution_result: {
      Success?: unknown;
      Failure?: { error_message: string };
    };
  };
  Fault?: unknown;
}

type DeployWatcher = {
  callback: (result: { success: boolean; timedOut?: boolean; error?: string }) => void;
  timeoutId: ReturnType<typeof setTimeout>;
};

const pendingDeployWatchers = new Map<string, DeployWatcher>();

/**
 * Register a callback to be invoked when a specific deploy is processed on-chain.
 * Uses the Casper node SSE DeployProcessed event — lightweight, no WASM transfer.
 * If the SSE event is missed (connection drop), times out and signals `timedOut: true`
 * so the caller can run a fallback status check.
 */
export function watchDeployResult(
  deployHash: string,
  callback: (result: { success: boolean; timedOut?: boolean; error?: string }) => void,
  timeoutMs = 300_000,
): void {
  // Cancel any existing watcher for this hash
  const existing = pendingDeployWatchers.get(deployHash);
  if (existing) clearTimeout(existing.timeoutId);

  const timeoutId = setTimeout(() => {
    pendingDeployWatchers.delete(deployHash);
    logger.warn('[events] SSE watcher timed out — no DeployProcessed event received', {
      deployHash,
      timeoutMs,
    });
    // Signal SSE timeout — NOT a confirmed failure.
    // Caller should do a fallback poll before deciding the outcome.
    callback({ success: false, timedOut: true });
  }, timeoutMs);

  pendingDeployWatchers.set(deployHash, { callback, timeoutId });
  logger.info('[events] SSE watcher registered', { deployHash, timeoutMs });
}

function handleCasperEvent(rawData: string): void {
  try {
    const data = JSON.parse(rawData) as CasperSseEvent;

    if (data.BlockAdded) {
      sseEmitter.emit('CHAIN_EVENT', {
        type: 'CHAIN_EVENT',
        data: {
          source: 'casper-node',
          eventType: 'BlockAdded',
          blockHash: data.BlockAdded.block_hash,
          blockHeight: data.BlockAdded.block.header.height,
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (data.DeployProcessed) {
      const dp = data.DeployProcessed;
      const success = !!dp.execution_result?.Success;
      const errorMsg = dp.execution_result?.Failure?.error_message;

      sseEmitter.emit('CHAIN_EVENT', {
        type: 'CHAIN_EVENT',
        data: {
          source: 'casper-node',
          eventType: 'DeployProcessed',
          deployHash: dp.deploy_hash,
          blockHash: dp.block_hash,
          success,
          error: errorMsg,
        },
        timestamp: new Date().toISOString(),
      });
      logger.info('[events] DeployProcessed received', {
        deployHash: dp.deploy_hash,
        success,
        error: errorMsg,
        hasWatcher: pendingDeployWatchers.has(dp.deploy_hash),
      });

      // Notify any registered vault deploy watcher
      const watcher = pendingDeployWatchers.get(dp.deploy_hash);
      if (watcher) {
        clearTimeout(watcher.timeoutId);
        pendingDeployWatchers.delete(dp.deploy_hash);
        watcher.callback({ success, timedOut: false, error: errorMsg });
      } else {
        logger.debug('[events] DeployProcessed — no active watcher for this hash', { deployHash: dp.deploy_hash });
      }
    }
  } catch {
    // Ignore unparseable events
  }
}

function createSseConnection(url: string): EventSource {
  const source = new EventSourceLib(url) as EventSource;
  source.onmessage = (event: MessageEvent) => handleCasperEvent(event.data as string);
  source.onerror = () => logger.warn('Casper SSE connection error, will auto-reconnect', { url });
  source.onopen = () => logger.info('Casper SSE listener connected', { url });
  return source;
}

export function startCasperEventListener(): void {
  if (casperSseMain) {
    logger.warn('Casper SSE listener already running');
    return;
  }

  // Listen to both /main and /deploys for maximum deploy event coverage.
  // /deploys is a dedicated stream that only sends deploy events and is lighter to process.
  const mainUrl = `${config.CASPER_SSE_URL}/main`;
  const deploysUrl = `${config.CASPER_SSE_URL}/deploys`;

  logger.info('Starting Casper node SSE listeners', { mainUrl, deploysUrl });
  casperSseMain = createSseConnection(mainUrl);
  casperSseDeploys = createSseConnection(deploysUrl);
}

export function stopCasperEventListener(): void {
  if (casperSseMain) { casperSseMain.close(); casperSseMain = null; }
  if (casperSseDeploys) { casperSseDeploys.close(); casperSseDeploys = null; }
  logger.info('Casper SSE listeners stopped');
}
