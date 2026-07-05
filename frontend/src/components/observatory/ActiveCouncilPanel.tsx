'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { RwaCouncilTheater } from '@/components/rwa/RwaCouncilTheater';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchCouncilPending } from '@/lib/api';
import { formatUSD } from '@/lib/formatters';
import { readObservatoryPreview } from '@/lib/observatory-focus';
import { COUNCIL_MIN_APPROVE, COUNCIL_VOTING_COUNT } from '@/lib/constants';
import type { RwaSummary } from '@/types/api.types';

interface ActiveCouncilPanelProps {
  focusRwaId?: string | null;
  apyByRwaId?: Map<string, number | null>;
  onViewDetail?: (rwaId: string) => void;
}

function findInCouncil(
  focusId: string | null | undefined,
  council: { pending: RwaSummary[]; inProgress: RwaSummary[] } | undefined,
): RwaSummary | undefined {
  if (!council) return undefined;
  const all = [...council.inProgress, ...council.pending];
  if (focusId) {
    const focused = all.find((r) => r.id === focusId);
    if (focused) return focused;
  }
  return council.inProgress[0] ?? council.pending[0];
}

export function ActiveCouncilPanel({
  focusRwaId,
  apyByRwaId,
  onViewDetail,
}: ActiveCouncilPanelProps) {
  const { data: council, isLoading } = useQuery({
    queryKey: ['council-pending'],
    queryFn: fetchCouncilPending,
    refetchInterval: 5000,
  });

  const activeRwa = findInCouncil(focusRwaId, council);
  const theaterRwaId = activeRwa?.id ?? focusRwaId ?? null;
  const showTheater = Boolean(theaterRwaId);
  const preview = theaterRwaId ? readObservatoryPreview(theaterRwaId) : undefined;

  const issuerName = (activeRwa as { issuerName?: string } | undefined)?.issuerName
    ?? preview?.counterpartyName;
  const buyerName = (activeRwa as { buyerName?: string } | undefined)?.buyerName
    ?? preview?.counterpartyName;
  const faceValue = activeRwa?.faceValue ?? preview?.faceValue;
  const currency = activeRwa?.currency ?? preview?.currency ?? 'USD';
  const apy = theaterRwaId ? apyByRwaId?.get(theaterRwaId) : undefined;

  const isFocusOnlyTerminal = useMemo(() => {
    if (!focusRwaId || activeRwa) return false;
    return Boolean(theaterRwaId);
  }, [focusRwaId, activeRwa, theaterRwaId]);

  if (isLoading && !theaterRwaId) {
    return <Skeleton className="min-h-[350px] rounded-2xl" />;
  }

  return (
    <div className="p-6 rounded-2xl border border-violet-500/[0.12] bg-bg-card/50 flex flex-col justify-between min-h-[350px]">
      <div>
        <h3 className="text-xs font-mono text-text-muted uppercase tracking-wider mb-4">
          Active Council Processing
        </h3>

        {showTheater && theaterRwaId ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-violet-500/20 bg-violet-950/10 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <span className="block text-[10px] text-text-muted uppercase font-mono">
                  {isFocusOnlyTerminal ? 'Council Resolution' : 'Proposal Under Audit'}
                </span>
                <span className="font-bold text-base text-text-primary truncate block">
                  {issuerName ?? 'Unknown Issuer'}
                </span>
                <span className="text-xs text-text-secondary block font-light truncate">
                  Debtor: {buyerName ?? '—'}
                </span>
                <span className="text-[10px] text-text-muted font-mono mt-1 block">
                  {theaterRwaId.slice(0, 8)}…
                </span>
              </div>
              <div className="text-right shrink-0">
                <span className="block text-[10px] text-text-muted uppercase font-mono">Value</span>
                {faceValue != null && (
                  <span className="font-mono text-base text-teal-400 font-bold">
                    {formatUSD(faceValue)} {currency}
                  </span>
                )}
                <span className="text-[10px] text-violet-400 block font-mono font-semibold">
                  {apy != null ? `${apy}% APY` : 'APY pending'}
                </span>
              </div>
            </div>

            <RwaCouncilTheater
              rwaId={theaterRwaId}
              preview={preview}
              embedded
              onViewDetail={onViewDetail}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <RefreshCw className="w-6 h-6 animate-spin" style={{ animationDuration: '12s' }} />
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold text-text-primary text-sm">System Listening & Standby</h4>
              <p className="text-xs text-text-muted max-w-sm font-light">
                Council is idle, listening for incoming RWA invoices. Submit an invoice to awaken the swarm.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-violet-500/[0.12] pt-4 mt-6 flex items-center justify-between text-[11px] font-mono text-text-muted">
        <span>
          Signature Multi-sig Threshold: {COUNCIL_MIN_APPROVE} / {COUNCIL_VOTING_COUNT}
        </span>
        <span className="text-teal-400">x402 Micropayment Engine: Active</span>
      </div>
    </div>
  );
}
