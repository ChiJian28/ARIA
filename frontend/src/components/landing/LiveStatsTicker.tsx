'use client';

import { useMemo } from 'react';
import { useVaultStats } from '@/hooks/useVault';
import { useAgentStore } from '@/store/agent.store';
import { motesToCspr } from '@/lib/formatters';
import { getSseAgentId, getSsePayload } from '@/lib/sse-helpers';
import type { SseEvent } from '@/types/api.types';

function Separator() {
  return <span className="text-text-muted/50 select-none">•</span>;
}

function TickerSegments({
  pulseText,
  tvlCspr,
  sentinelText,
  consensusText,
  apy,
}: {
  pulseText: string;
  tvlCspr: number;
  sentinelText: string;
  consensusText: string;
  apy: string;
}) {
  return (
    <div className="flex items-center gap-12 shrink-0">
      <div className="flex items-center gap-2.5">
        <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
        <span className="text-teal-400 font-semibold">[PULSE]</span>
        <span>{pulseText}</span>
      </div>
      <Separator />
      <div className="flex items-center gap-2.5">
        <span className="text-violet-400 font-semibold">TVL:</span>
        <span className="text-text-primary font-bold">
          {tvlCspr.toLocaleString('en-US', { maximumFractionDigits: 0 })} CSPR
        </span>
      </div>
      <Separator />
      <div className="flex items-center gap-2.5">
        <span className="text-amber-400 font-semibold">SENTINEL_ALERT:</span>
        <span>{sentinelText}</span>
      </div>
      <Separator />
      <div className="flex items-center gap-2.5">
        <span className="text-emerald-400 font-semibold">CONSENSUS:</span>
        <span>{consensusText}</span>
      </div>
      <Separator />
      <div className="flex items-center gap-2.5">
        <span className="text-indigo-400 font-semibold">CEP-18:</span>
        <span>LP Yield standardizes at {apy}% APY</span>
      </div>
    </div>
  );
}

function findLatestSse(
  events: SseEvent[],
  predicate: (e: SseEvent) => boolean,
): SseEvent | undefined {
  return events.find(predicate);
}

export function LiveStatsTicker() {
  const { data: vaultStats } = useVaultStats();
  const sseEvents = useAgentStore((s) => s.sseEvents);

  const tvlCspr = vaultStats
    ? motesToCspr(vaultStats.tvlMotes)
    : 128_450;

  const apy = vaultStats
    ? (vaultStats.currentApy * 100).toFixed(1)
    : '12.4';

  const pulseText = useMemo(() => {
    const x402Event = findLatestSse(sseEvents, (e) => {
      if (e.type === 'AGENT_STATUS_UPDATE') {
        const msg = String(getSsePayload(e).message ?? '');
        return msg.toLowerCase().includes('x402');
      }
      return false;
    });
    if (x402Event) {
      const agentId = getSseAgentId(x402Event);
      const label = agentId ? `${agentId.charAt(0).toUpperCase()}${agentId.slice(1)}` : 'Risk';
      const msg = String(getSsePayload(x402Event).message ?? '');
      return msg || `${label} Agent paid via x402 Micropayments`;
    }
    return 'Risk Agent paid 0.05 CSPR via x402 Micropayments';
  }, [sseEvents]);

  const sentinelText = useMemo(() => {
    const alert = findLatestSse(sseEvents, (e) => e.type === 'SENTINEL_ALERT');
    if (alert) {
      const msg = getSsePayload(alert).message;
      return typeof msg === 'string' && msg
        ? msg
        : 'Initiated liquidity verification on RWA Asset #401';
    }
    return 'Initiated liquidity verification on RWA Asset #401';
  }, [sseEvents]);

  const consensusText = useMemo(() => {
    const consensus = findLatestSse(sseEvents, (e) => e.type === 'CONSENSUS_REACHED');
    if (consensus) {
      const rwaId = String(getSsePayload(consensus).rwaId ?? '').slice(0, 8);
      return rwaId
        ? `Council reached consensus on RWA ${rwaId}…`
        : 'Council reached 4/4 approval on Vanguard AgriGroup Invoice';
    }
    return 'Council reached 4/4 approval on Vanguard AgriGroup Invoice';
  }, [sseEvents]);

  const segmentProps = { pulseText, tvlCspr, sentinelText, consensusText, apy };

  return (
    <div
      className="relative w-full max-w-5xl mx-auto mt-12 overflow-hidden border-y border-violet-500/10 bg-bg-card/30 backdrop-blur-sm py-3.5"
      id="hero-ticker-container"
    >
      <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-bg-deep to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-bg-deep to-transparent z-10 pointer-events-none" />

      <div className="flex w-max animate-landing-ticker will-change-transform">
        <TickerSegments {...segmentProps} />
        <TickerSegments {...segmentProps} />
      </div>
    </div>
  );
}
