'use client';

import { TrendingUp, Layers, Activity, BarChart2 } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { Skeleton } from '@/components/ui/skeleton';
import { useVaultStats } from '@/hooks/useVault';
import { motesToCspr } from '@/lib/formatters';

export function VaultStatsGrid() {
  const { data, isLoading } = useVaultStats();

  if (isLoading) {
    return <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}</div>;
  }

  const tvl = data ? motesToCspr(data.tvlMotes).toFixed(0) : '—';
  const apy = data ? `${(data.currentApy * 100).toFixed(1)}%` : '—';
  const util = data
    ? `${data.utilizationPct ?? 0}%`
    : '—';
  const active = data?.activeCollateral ?? '—';

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard label="Total TVL" value={`${tvl} CSPR`} delta="Live" deltaPositive icon={TrendingUp} mono />
      <StatCard label="Current APY" value={apy} delta="Estimated" deltaPositive icon={BarChart2} />
      <StatCard label="Utilization" value={util} icon={Activity} />
      <StatCard label="Active RWAs" value={String(active)} icon={Layers} />
    </div>
  );
}
