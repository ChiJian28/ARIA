'use client';

import { useVaultStats } from '@/hooks/useVault';
import { useRwas } from '@/hooks/useRwa';
import { StatCard } from '@/components/ui/stat-card';
import { Skeleton } from '@/components/ui/skeleton';
import { motesToCspr } from '@/lib/formatters';
import { TrendingUp, CheckCircle, Clock, Award } from 'lucide-react';

export function ProtocolStats() {
  const { data: vaultStats, isLoading: vLoading } = useVaultStats();
  const { data: rwas, isLoading: rLoading } = useRwas({ limit: 100 });

  if (vLoading || rLoading) {
    return <div className="grid grid-cols-2 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>;
  }

  const total = rwas?.length ?? 0;
  const approved = rwas?.filter((r) => r.status === 'APPROVED' || r.status === 'SETTLED').length ?? 0;
  const tvl = vaultStats ? motesToCspr(vaultStats.tvlMotes).toFixed(0) : '0';
  const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;

  return (
    <div className="grid grid-cols-2 gap-4">
      <StatCard label="Total Financed" value={`${tvl} CSPR`} icon={TrendingUp} mono />
      <StatCard label="Approved Rate" value={`${approvalRate}%`} icon={CheckCircle} />
      <StatCard label="Total RWAs" value={String(total)} icon={Award} />
      <StatCard label="Active Now" value={String(vaultStats?.activeCollateral ?? 0)} icon={Clock} />
    </div>
  );
}
