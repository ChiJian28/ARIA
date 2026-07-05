'use client';

import Link from 'next/link';
import { formatDate, formatUSD } from '@/lib/formatters';
import { StatusBadge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { RwaSummary } from '@/types/api.types';

interface RwaStatusCardProps {
  rwa: RwaSummary;
  voteCount?: number;
  totalVotes?: number;
}

export function RwaStatusCard({ rwa, voteCount = 0, totalVotes = 3 }: RwaStatusCardProps) {
  return (
    <Link href={`/rwa/${rwa.id}`}>
      <div className="rounded-xl bg-bg-card border border-violet-500/[0.15] hover:border-violet-500/30 p-4 transition-all cursor-pointer">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-text-primary">{rwa.assetType.replace('_', ' ')}</p>
            <p className="text-xs text-text-muted mt-0.5 font-mono">{rwa.id.slice(0, 16)}…</p>
          </div>
          <StatusBadge status={rwa.status} />
        </div>

        <div className="flex items-center justify-between text-xs text-text-secondary mb-2">
          <span className="font-mono">{formatUSD(rwa.faceValue)} {rwa.currency}</span>
          <span>Matures {formatDate(rwa.maturityDate)}</span>
        </div>

        {(rwa.status === 'VOTING' || rwa.status === 'ANALYZING') && (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-text-muted">
              <span>{voteCount}/{totalVotes} votes</span>
              {rwa.riskScore !== null && <span>Risk {rwa.riskScore}</span>}
            </div>
            <Progress value={voteCount} max={totalVotes} />
          </div>
        )}
      </div>
    </Link>
  );
}
