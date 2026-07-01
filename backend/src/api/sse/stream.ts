import { Router, Request, Response } from 'express';
import { sseEmitter } from './emitter';
import { SseEventType, SseEvent } from '../../utils/types/api.types';
import logger from '../../utils/logger';

export const sseRouter = Router();

const SSE_EVENT_TYPES: SseEventType[] = [
  'AGENT_STARTED',
  'AGENT_STATUS_UPDATE',
  'AGENT_COMPLETED',
  'VOTE_CAST',
  'CONSENSUS_REACHED',
  'NFT_MINTED',
  'PIPELINE_STATUS',
  'SENTINEL_ALERT',
  'VAULT_EVENT',
  'CHAIN_EVENT',
];

sseRouter.get('/events', (req: Request, res: Response) => {
  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const clientId = `client-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  logger.info('SSE client connected', { clientId });

  // Send initial connection event
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', clientId, timestamp: new Date().toISOString() })}\n\n`);

  const sendEvent = (event: SseEvent) => {
    try {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    } catch {
      // Client disconnected
    }
  };

  // Subscribe to all event types
  const listeners: { type: string; fn: (data: SseEvent) => void }[] = [];
  for (const eventType of SSE_EVENT_TYPES) {
    const fn = (data: SseEvent) => sendEvent(data);
    sseEmitter.on(eventType, fn);
    listeners.push({ type: eventType, fn });
  }

  // Heartbeat every 30 seconds to keep connection alive
  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch {
      clearInterval(heartbeat);
    }
  }, 30000);

  // Cleanup on client disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    for (const { type, fn } of listeners) {
      sseEmitter.removeListener(type, fn);
    }
    logger.info('SSE client disconnected', { clientId });
  });
});
