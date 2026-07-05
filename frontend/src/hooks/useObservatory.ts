'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchObservatoryAuditTrail } from '@/lib/api';
import { sseEmitter } from '@/lib/sse';
import type { SseEvent } from '@/types/api.types';

const AUDIT_TRAIL_REFRESH_EVENTS = new Set<SseEvent['type']>([
  'CONSENSUS_REACHED',
  'PIPELINE_STATUS',
  'VOTE_CAST',
  'NFT_MINTED',
]);

export function useObservatoryAuditTrail(limit = 20) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const handler = (event: SseEvent) => {
      if (AUDIT_TRAIL_REFRESH_EVENTS.has(event.type)) {
        void queryClient.invalidateQueries({ queryKey: ['observatory', 'audit-trail'] });
      }
    };
    sseEmitter.on('*', handler);
    return () => {
      sseEmitter.off('*', handler);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['observatory', 'audit-trail', limit],
    queryFn: () => fetchObservatoryAuditTrail({ limit }),
    staleTime: 5_000,
    refetchInterval: 10_000,
  });
}
