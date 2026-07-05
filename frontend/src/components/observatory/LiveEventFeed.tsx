'use client';

import { useSSE } from '@/hooks/useSSE';
import { formatDateTime } from '@/lib/formatters';
import { cn } from '@/lib/cn';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import type { SseEvent } from '@/types/api.types';
import { EXPLORER_URL } from '@/lib/constants';
import { ExternalLink } from 'lucide-react';

const eventConfig: Record<string, { color: string; label: string; icon: string }> = {
  AGENT_STARTED: { color: 'text-violet-400', label: 'Agent Started', icon: '⚡' },
  AGENT_STATUS_UPDATE: { color: 'text-teal-400', label: 'Agent CoT', icon: '▸' },
  AGENT_COMPLETED: { color: 'text-emerald-400', label: 'Agent Done', icon: '✓' },
  VOTE_CAST: { color: 'text-teal-400', label: 'Vote Cast', icon: '🗳' },
  CONSENSUS_REACHED: { color: 'text-emerald-300', label: 'Consensus', icon: '🏛' },
  NFT_MINTED: { color: 'text-violet-300', label: 'NFT Minted', icon: '🎨' },
  PIPELINE_STATUS: { color: 'text-sky-400', label: 'Pipeline', icon: '📊' },
  SENTINEL_ALERT: { color: 'text-red-400', label: 'Alert', icon: '🚨' },
  VAULT_EVENT: { color: 'text-teal-400', label: 'Vault', icon: '🏦' },
  CHAIN_EVENT: { color: 'text-sky-400', label: 'Chain', icon: '⛓' },
};

function EventItem({ event }: { event: SseEvent }) {
  const cfg = eventConfig[event.type] ?? { color: 'text-text-secondary', label: event.type, icon: '•' };
  const txHash = event.payload?.txHash as string | undefined;

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-violet-500/[0.08] last:border-0">
      <span className="text-base w-6 shrink-0">{cfg.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn('text-xs font-semibold', cfg.color)}>{cfg.label}</span>
          {txHash && (
            <a
              href={`${EXPLORER_URL}/deploy/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] text-sky-400/70 hover:text-sky-400 font-mono"
            >
              {txHash.slice(0, 8)}… <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}
        </div>
        {event.payload && Object.keys(event.payload).filter((k) => k !== 'txHash').length > 0 && (
          <p className="text-[10px] text-text-muted mt-0.5 truncate">
            {Object.entries(event.payload)
              .filter(([k]) => k !== 'txHash')
              .map(([k, v]) => `${k}: ${v}`)
              .join(' · ')
              .slice(0, 100)}
          </p>
        )}
      </div>
      <span className="text-[10px] text-text-muted whitespace-nowrap">{formatDateTime(event.timestamp)}</span>
    </div>
  );
}

export function LiveEventFeed({ maxItems = 30 }: { maxItems?: number }) {
  const { events, connected } = useSSE();
  const filtered = events.filter((e) => e.type !== 'CONNECTED').slice(0, maxItems);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Live Event Feed</CardTitle>
          <div className="flex items-center gap-1.5">
            <div className={cn('w-2 h-2 rounded-full', connected ? 'bg-emerald-400 animate-pulse' : 'bg-text-muted')} />
            <span className="text-xs text-text-secondary">{connected ? 'Live' : 'Connecting…'}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 overflow-y-auto max-h-96">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-text-muted gap-2">
            <div className="w-3 h-3 rounded-full bg-text-muted animate-pulse" />
            <span className="text-sm">Waiting for events…</span>
          </div>
        ) : (
          filtered.map((e, i) => <EventItem key={i} event={e} />)
        )}
      </CardContent>
    </Card>
  );
}
