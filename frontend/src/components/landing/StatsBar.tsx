'use client';

import { useVaultStats } from '@/hooks/useVault';
import { useRwas } from '@/hooks/useRwa';
import { useAgents } from '@/hooks/useAgents';
import { motesToCspr } from '@/lib/formatters';
import { COUNCIL_VOTING_COUNT } from '@/lib/constants';

export function StatsBar() {
  const { data: vaultStats } = useVaultStats();
  const { data: rwas } = useRwas({ limit: 100 });
  const { data: agents } = useAgents();

  const votingAgentCount = agents?.filter((a) => a.voteWeight > 0).length ?? COUNCIL_VOTING_COUNT;

  const stats = [
    { label: 'Total TVL', value: vaultStats ? `${motesToCspr(vaultStats.tvlMotes).toFixed(0)} CSPR` : '...' },
    { label: 'APY', value: vaultStats ? `${(vaultStats.currentApy * 100).toFixed(1)}%` : '...' },
    { label: 'RWAs Processed', value: rwas ? String(rwas.length) : '...' },
    { label: 'Network', value: 'Casper Testnet' },
    { label: 'Active Agents', value: String(votingAgentCount) },
  ];

  return (
    <div className="border-y border-violet-500/[0.12] bg-bg-surface/50 py-4">
      <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 px-6">
        {stats.map(({ label, value }, index) => (
          <div key={label} className="flex items-center gap-3 whitespace-nowrap">
            <span className="text-text-muted text-sm">{label}</span>
            <span className="text-text-primary font-mono font-semibold text-sm">{value}</span>
            {index < stats.length - 1 && <span className="text-violet-500/40 hidden sm:inline">·</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
