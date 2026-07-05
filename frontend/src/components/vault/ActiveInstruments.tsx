'use client';

import { useRwas } from '@/hooks/useRwa';
import { StatusBadge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate, formatUSD } from '@/lib/formatters';
import Link from 'next/link';

export function ActiveInstruments() {
  const { data, isLoading } = useRwas({ limit: 20 });
  const active = data?.filter((r) => r.status === 'APPROVED' || r.status === 'ANALYZING' || r.status === 'VOTING') ?? [];

  if (isLoading) return <Skeleton className="h-40" />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-violet-500/[0.12]">
            {['ID', 'Type', 'Value', 'Risk', 'Maturity', 'Status'].map((h) => (
              <th key={h} className="text-left py-2 pr-4 text-xs text-text-secondary font-medium uppercase tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {active.length === 0 && (
            <tr><td colSpan={6} className="py-6 text-center text-text-muted text-sm">No active instruments</td></tr>
          )}
          {active.map((rwa) => (
            <tr key={rwa.id} className="border-b border-violet-500/[0.06] hover:bg-bg-card-hover/50 transition-colors">
              <td className="py-2.5 pr-4">
                <Link href={`/rwa/${rwa.id}`} className="font-mono text-xs text-sky-400 hover:text-sky-300">
                  {rwa.id.slice(0, 8)}…
                </Link>
              </td>
              <td className="py-2.5 pr-4 text-text-secondary text-xs">{rwa.assetType.replace('_', ' ')}</td>
              <td className="py-2.5 pr-4 font-mono text-text-primary">{formatUSD(rwa.faceValue)}</td>
              <td className="py-2.5 pr-4 font-mono text-text-secondary">{rwa.riskScore ?? '—'}</td>
              <td className="py-2.5 pr-4 text-text-secondary text-xs">{formatDate(rwa.maturityDate)}</td>
              <td className="py-2.5"><StatusBadge status={rwa.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
