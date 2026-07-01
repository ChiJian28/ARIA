// eslint-disable-next-line @typescript-eslint/no-require-imports
const EventSourceLib = require('eventsource') as typeof EventSource;
import { config } from '../../config';
import { sseEmitter } from '../../api/sse/emitter';
import logger from '../../utils/logger';

let csprCloudSse: EventSource | null = null;

export function startCsprCloudStream(): void {
  if (csprCloudSse) {
    logger.warn('CSPR.cloud SSE stream already running');
    return;
  }

  const url = `${config.CSPR_CLOUD_SSE_URL}/blocks?apiKey=${config.CSPR_CLOUD_API_KEY ?? ''}`;

  logger.info('Starting CSPR.cloud SSE stream', { url: config.CSPR_CLOUD_SSE_URL });

  csprCloudSse = new EventSourceLib(url) as EventSource;

  csprCloudSse.onmessage = (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data as string) as Record<string, unknown>;
      sseEmitter.emit('CHAIN_EVENT', {
        type: 'CHAIN_EVENT',
        data: { source: 'cspr.cloud', ...data },
        timestamp: new Date().toISOString(),
      });
    } catch {
      // Ignore malformed events
    }
  };

  csprCloudSse.onerror = () => {
    logger.warn('CSPR.cloud SSE stream error');
    // EventSource auto-reconnects
  };

  csprCloudSse.onopen = () => {
    logger.info('CSPR.cloud SSE stream connected');
  };
}

export function stopCsprCloudStream(): void {
  if (csprCloudSse) {
    csprCloudSse.close();
    csprCloudSse = null;
    logger.info('CSPR.cloud SSE stream stopped');
  }
}
