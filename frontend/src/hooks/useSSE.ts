'use client';

import { useAgentStore } from '@/store/agent.store';
import type { SseEventType } from '@/types/api.types';

export function useSSE(eventType?: SseEventType) {
  const allEvents = useAgentStore((s) => s.sseEvents);
  const connected = useAgentStore((s) => s.sseConnected);

  const events = eventType
    ? allEvents.filter((e) => e.type === eventType)
    : allEvents;

  return { events, connected };
}
