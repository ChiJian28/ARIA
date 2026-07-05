'use client';

import { useLeaderboard } from '@/hooks/useAgents';
import { Skeleton } from '@/components/ui/skeleton';
import { EXPLORER_URL } from '@/lib/constants';
import { ExternalLink } from 'lucide-react';

export function AgentRepLeaderboard() {
  const { data, isLoading } = useLeaderboard();

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-violet-500/[0.12]">
            {['#', 'Agent', 'Score', 'Votes', 'Accuracy', 'NFT'].map((h) => (
              <th key={h} className="text-left py-2 pr-4 text-xs text-text-secondary font-medium uppercase tracking-wide">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(data ?? []).map((entry) => (
            <tr key={entry.agentId} className="border-b border-violet-500/[0.06] hover:bg-bg-card-hover/50 transition-colors">
              <td className="py-2.5 pr-4 font-mono text-text-muted text-xs">{entry.rank}</td>
              <td className="py-2.5 pr-4 font-semibold text-text-primary">{entry.name}</td>
              <td className="py-2.5 pr-4 font-mono text-violet-400">{entry.reputationScore}</td>
              <td className="py-2.5 pr-4 font-mono text-text-secondary">{entry.totalVotes}</td>
              <td className="py-2.5 pr-4 font-mono text-emerald-400">{entry.accuracy}%</td>
              <td className="py-2.5">
                {entry.nftTokenId ? (
                  <a
                    href={`${EXPLORER_URL}/contract/${entry.nftTokenId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-400 hover:text-sky-300 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <span className="text-text-muted text-xs">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
