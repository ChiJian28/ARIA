'use client';

import { useEffect } from 'react';
import { connectSSE, sseEmitter, getSSEStatus } from '@/lib/sse';
import { useAgentStore } from '@/store/agent.store';
import type { SseEvent } from '@/types/api.types';

export function SSEProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    connectSSE();

    const onAny = (event: SseEvent) => {
      const { handleSseEvent, setSseConnected } = useAgentStore.getState();
      if (event.type === 'CONNECTED') setSseConnected(true);
      handleSseEvent(event);
    };

    sseEmitter.on('*', onAny);

    const interval = setInterval(() => {
      const { setSseConnected } = useAgentStore.getState();
      const status = getSSEStatus();
      setSseConnected(status === 'connected');
      if (status === 'disconnected') {
        connectSSE();
      }
    }, 3000);

    return () => {
      sseEmitter.off('*', onAny);
      clearInterval(interval);
    };
  }, []);

  return <>{children}</>;
}
