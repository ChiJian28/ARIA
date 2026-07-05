import mitt from 'mitt';
import type { SseEvent, SseEventType } from '@/types/api.types';

type Events = Record<SseEventType, SseEvent> & { '*': SseEvent };

export const sseEmitter = mitt<Events>();

let eventSource: EventSource | null = null;

export function connectSSE() {
  if (typeof window === 'undefined') return;

  // Only skip if an OPEN or CONNECTING connection already exists
  if (eventSource && eventSource.readyState !== EventSource.CLOSED) return;

  // Clean up any stale CLOSED instance
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }

  const backendUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
  eventSource = new EventSource(`${backendUrl}/api/sse/events`);

  eventSource.onopen = () => {
    // Emit a synthetic CONNECTED event so the LiveDot turns green immediately
    sseEmitter.emit('CONNECTED', {
      type: 'CONNECTED',
      timestamp: new Date().toISOString(),
    });
  };

  eventSource.onmessage = (e) => {
    try {
      const raw = JSON.parse(e.data);
      // Normalise: always ensure a valid ISO timestamp
      const event: SseEvent = {
        ...raw,
        timestamp: raw.timestamp && !isNaN(Date.parse(raw.timestamp))
          ? raw.timestamp
          : new Date().toISOString(),
      };
      sseEmitter.emit(event.type, event);
      sseEmitter.emit('*', event);
    } catch {
      // ignore parse errors
    }
  };

  // Don't close on error — let the browser's built-in EventSource
  // auto-reconnect (CONNECTING → OPEN). We'll detect and re-create
  // only if readyState reaches CLOSED via the SSEProvider poll.
  eventSource.onerror = () => {};
}

export function disconnectSSE() {
  eventSource?.close();
  eventSource = null;
}

export function getSSEStatus(): 'connected' | 'connecting' | 'disconnected' {
  if (!eventSource) return 'disconnected';
  if (eventSource.readyState === EventSource.OPEN) return 'connected';
  if (eventSource.readyState === EventSource.CONNECTING) return 'connecting';
  return 'disconnected';
}
