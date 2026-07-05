'use client';

import { useSSE } from '@/hooks/useSSE';
import { formatDateTime } from '@/lib/formatters';
import { cn } from '@/lib/cn';
import type { SseEvent } from '@/types/api.types';

const eventStyle: Record<string, { color: string; label: string }> = {
  AGENT_STARTED: { color: 'text-violet-400', label: 'Agent Started' },
  AGENT_STATUS_UPDATE: { color: 'text-teal-400', label: 'Agent CoT' },
  AGENT_COMPLETED: { color: 'text-emerald-400', label: 'Agent Completed' },
  VOTE_CAST: { color: 'text-teal-400', label: 'Vote Cast' },
  CONSENSUS_REACHED: { color: 'text-emerald-400', label: 'Consensus Reached' },
  NFT_MINTED: { color: 'text-violet-300', label: 'NFT Minted' },
  PIPELINE_STATUS: { color: 'text-sky-400', label: 'Pipeline Update' },
  SENTINEL_ALERT: { color: 'text-red-400', label: 'Sentinel Alert' },
  VAULT_EVENT: { color: 'text-teal-400', label: 'Vault Event' },
  CHAIN_EVENT: { color: 'text-sky-400', label: 'Chain Event' },
};

function EventRow({ event }: { event: SseEvent }) {
  const style = eventStyle[event.type] ?? { color: 'text-text-secondary', label: event.type };
  return (
    <div className="flex items-start gap-3 py-2 border-b border-violet-500/[0.08] last:border-0">
      <div className={cn('text-xs font-medium mt-0.5 w-28 shrink-0', style.color)}>{style.label}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-text-secondary truncate">
          {event.payload ? JSON.stringify(event.payload).slice(0, 80) : '—'}
        </p>
      </div>
      <div className="text-[10px] text-text-muted whitespace-nowrap">{formatDateTime(event.timestamp)}</div>
    </div>
  );
}

export function AgentActivityFeed({ maxItems = 20 }: { maxItems?: number }) {
  const { events } = useSSE();
  const filtered = events.filter((e) => e.type !== 'CONNECTED').slice(0, maxItems);

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-text-muted text-sm">
        <div className="w-2 h-2 rounded-full bg-text-muted animate-pulse mb-2" />
        Waiting for events…
      </div>
    );
  }

  return (
    <div className="overflow-y-auto max-h-80 scrollbar-thin">
      {filtered.map((e, i) => (
        <EventRow key={i} event={e} />
      ))}
    </div>
  );
}
