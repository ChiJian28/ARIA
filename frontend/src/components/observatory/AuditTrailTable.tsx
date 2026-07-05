'use client';

import { Scale, Search } from 'lucide-react';
import { useObservatoryAuditTrail } from '@/hooks/useObservatory';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate, formatUSD } from '@/lib/formatters';
import type { ObservatoryAuditTrailEntry } from '@/types/api.types';
import { cn } from '@/lib/cn';

interface AuditTrailTableProps {
  onSelectRwa: (rwaId: string) => void;
}

function DecisionBadge({ status }: { status: string }) {
  if (status === 'APPROVED' || status === 'SETTLED' || status === 'ACTIVE') {
    return (
      <span className="text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded text-[10px] font-medium font-mono inline-block">
        APPROVED
      </span>
    );
  }
  if (status === 'REJECTED' || status === 'DEFAULTED') {
    return (
      <span className="text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded text-[10px] font-medium font-mono inline-block">
        REJECTED
      </span>
    );
  }
  return (
    <span className="text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] font-medium font-mono inline-block animate-pulse">
      UNDER AUDIT
    </span>
  );
}

function AuditRow({
  entry,
  onSelect,
}: {
  entry: ObservatoryAuditTrailEntry;
  onSelect: (id: string) => void;
}) {
  return (
    <tr
      className="hover:bg-bg-card-hover/40 transition-colors cursor-pointer group"
      onClick={() => onSelect(entry.id)}
    >
      <td className="py-3 px-4 font-mono text-teal-400/90 text-[11px]">
        {entry.id.slice(0, 8)}…
      </td>
      <td className="py-3 px-4">
        <DecisionBadge status={entry.status} />
      </td>
      <td className="py-3 px-4 font-mono text-text-secondary text-[11px]">
        {entry.voteSummary.label}
      </td>
      <td className="py-3 px-4 font-mono text-text-primary text-[11px]">
        {formatUSD(entry.faceValue)} {entry.currency}
      </td>
      <td className="py-3 px-4 font-mono text-violet-400 text-[11px]">
        {entry.apy != null ? `${entry.apy}%` : '—'}
      </td>
      <td className="py-3 px-4 text-text-muted text-[11px]">{formatDate(entry.createdAt)}</td>
      <td className="py-3 px-4 text-right">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(entry.id);
          }}
          className={cn(
            'inline-flex items-center gap-1 text-[10px] font-mono text-violet-400',
            'opacity-70 group-hover:opacity-100 hover:text-violet-300 transition-colors',
          )}
        >
          <Search className="w-3 h-3" />
          Inspect
        </button>
      </td>
    </tr>
  );
}

export function AuditTrailTable({ onSelectRwa }: AuditTrailTableProps) {
  const { data, isLoading } = useObservatoryAuditTrail(30);

  return (
    <div className="p-6 rounded-2xl border border-violet-500/[0.12] bg-bg-card/50 space-y-4">
      <div>
        <h3 className="text-base font-bold text-text-primary flex items-center space-x-2">
          <Scale className="w-5 h-5 text-teal-400" />
          <span>Consensus Resolution Audit Trail</span>
        </h3>
        <p className="text-xs text-text-secondary font-light mt-0.5">
          Historical council records. Click any row to open the full RWA detail modal with agent reasoning.
        </p>
      </div>

      <div className="overflow-x-auto border border-violet-500/[0.08] rounded-xl bg-bg-elevated/30">
        {isLoading ? (
          <Skeleton className="h-48 m-4" />
        ) : (
          <table className="w-full border-collapse text-left text-xs min-w-[640px]">
            <thead>
              <tr className="border-b border-violet-500/[0.12] bg-bg-elevated/60 text-text-muted font-mono text-[10px] uppercase">
                <th className="py-3 px-4 font-semibold">Asset ID</th>
                <th className="py-3 px-4 font-semibold">Decision</th>
                <th className="py-3 px-4 font-semibold">Votes</th>
                <th className="py-3 px-4 font-semibold">Face Value</th>
                <th className="py-3 px-4 font-semibold">Yield (APY)</th>
                <th className="py-3 px-4 font-semibold">Submit Date</th>
                <th className="py-3 px-4 font-semibold text-right">Audit Trail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-violet-500/[0.06]">
              {(data ?? []).length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-text-muted text-sm">
                    No council records yet
                  </td>
                </tr>
              )}
              {(data ?? []).map((entry) => (
                <AuditRow key={entry.id} entry={entry} onSelect={onSelectRwa} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
