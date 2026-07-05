'use client';

import { Cpu, Award, ExternalLink } from 'lucide-react';
import { useLeaderboard } from '@/hooks/useAgents';
import { Skeleton } from '@/components/ui/skeleton';
import { formatAddress } from '@/lib/formatters';
import { explorerAccountUrl } from '@/lib/explorer';
import { COUNCIL_MERIT_AGENT_IDS, COUNCIL_VOTING_AGENT_IDS } from '@/lib/constants';

const MERIT_DISPLAY_NAMES: Record<string, string> = {
  risk: 'Risk Agent',
  valuation: 'Valuation Agent',
  compliance: 'Compliance Agent',
  sentinel: 'Sentinel Agent',
};

export function MeritocracyPanel() {
  const { data, isLoading } = useLeaderboard();

  if (isLoading) {
    return <Skeleton className="min-h-[350px] rounded-2xl" />;
  }

  const entries = COUNCIL_MERIT_AGENT_IDS.map((id) => data?.find((e) => e.agentId === id)).filter(Boolean);

  return (
    <div className="p-6 rounded-2xl border border-violet-500/[0.12] bg-bg-card/50 flex flex-col justify-between min-h-[350px]">
      <div className="space-y-4">
        <h3 className="text-xs font-mono text-text-muted uppercase tracking-wider">
          On-Chain Meritocracy
        </h3>
        <p className="text-xs text-text-secondary font-light">
          Council members earn reputation weight on Casper for verified credit precision. Accuracy failure degrades voting authority.
        </p>

        <div className="space-y-3 pt-2">
          {entries.map((entry) => {
            if (!entry) return null;
            const displayName = MERIT_DISPLAY_NAMES[entry.agentId] ?? entry.name;
            const isVoter = COUNCIL_VOTING_AGENT_IDS.includes(
              entry.agentId as (typeof COUNCIL_VOTING_AGENT_IDS)[number],
            );

            return (
              <div
                key={entry.agentId}
                className="p-3 rounded-xl border border-violet-500/[0.08] bg-bg-elevated/30 flex items-center justify-between gap-3"
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-950/40 to-teal-950/20 border border-violet-500/10 flex items-center justify-center shrink-0">
                    <Cpu className="w-4 h-4 text-violet-400" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-xs font-medium text-text-primary">{displayName}</span>
                    {entry.agentPublicKey ? (
                      <a
                        href={explorerAccountUrl(entry.agentPublicKey)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-[9px] text-teal-400 hover:text-teal-300 transition-colors inline-flex items-center gap-0.5 truncate max-w-[140px]"
                      >
                        <span>{formatAddress(entry.agentPublicKey, 6)}</span>
                        <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                      </a>
                    ) : (
                      <span className="font-mono text-[9px] text-text-muted">On-chain: —</span>
                    )}
                  </div>
                </div>

                <div className="flex space-x-3 text-right shrink-0">
                  <div>
                    <span className="block text-[8px] font-mono text-text-muted uppercase">Score</span>
                    <span className="font-mono text-xs font-bold text-text-primary">
                      {entry.reputationScore}
                    </span>
                  </div>
                  {isVoter && (
                    <>
                      <div>
                        <span className="block text-[8px] font-mono text-text-muted uppercase">Votes</span>
                        <span className="font-mono text-xs font-bold text-text-secondary">
                          {entry.totalVotes}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[8px] font-mono text-text-muted uppercase">
                          Accuracy
                        </span>
                        <span className="font-mono text-xs font-bold text-teal-400">
                          {entry.accuracy}%
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-violet-500/[0.12] pt-3 mt-4 text-[10px] text-text-muted font-light flex items-center space-x-1.5">
        <Award className="w-4 h-4 text-teal-400 shrink-0" />
        <span>Reputation synced via RwaRegistry.update_reputation on Casper testnet.</span>
      </div>
    </div>
  );
}
