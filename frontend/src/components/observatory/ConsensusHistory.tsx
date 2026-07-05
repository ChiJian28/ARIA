'use client';

import { useRwas } from '@/hooks/useRwa';
import { useQuery } from '@tanstack/react-query';
import { fetchCouncilVotes } from '@/lib/api';
import { StatusBadge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/formatters';
import Link from 'next/link';

export function ConsensusHistory() {
  const { data: rwas, isLoading } = useRwas({ limit: 10 });
  const decided = rwas?.filter((r) => r.status === 'APPROVED' || r.status === 'REJECTED') ?? [];

  if (isLoading) return <Skeleton className="h-48" />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-violet-500/[0.12]">
            {['RWA ID', 'Decision', 'Votes', 'Created'].map((h) => (
              <th key={h} className="text-left py-2 pr-4 text-xs text-text-secondary font-medium uppercase tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {decided.length === 0 && (
            <tr><td colSpan={4} className="py-6 text-center text-text-muted text-sm">No decided cases yet</td></tr>
          )}
          {decided.map((rwa) => (
            <tr key={rwa.id} className="border-b border-violet-500/[0.06] hover:bg-bg-card-hover/50 transition-colors">
              <td className="py-2.5 pr-4">
                <Link href={`/rwa/${rwa.id}`} className="font-mono text-xs text-sky-400 hover:text-sky-300">
                  {rwa.id.slice(0, 12)}…
                </Link>
              </td>
              <td className="py-2.5 pr-4"><StatusBadge status={rwa.status} /></td>
              <td className="py-2.5 pr-4 text-text-secondary text-xs">3/3</td>
              <td className="py-2.5 text-text-secondary text-xs">{formatDate(rwa.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
