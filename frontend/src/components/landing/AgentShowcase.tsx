'use client';

import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { AgentStatusOrb } from '@/components/agents/AgentStatusOrb';
import { useAgents } from '@/hooks/useAgents';
import { useAgentStore } from '@/store/agent.store';
import { fetchCouncilPending, fetchCouncilVotes } from '@/lib/api';
import {
  AGENT_LABELS,
  COUNCIL_VOTING_AGENT_IDS,
  COUNCIL_VOTING_COUNT,
} from '@/lib/constants';
import { cn } from '@/lib/cn';

function resolveAgentStatus(
  agentId: string,
  apiStatus: string | undefined,
  liveStatus: string | undefined,
  hasVoted: boolean,
): string {
  if (hasVoted) return 'VOTED';
  if (liveStatus === 'BUSY' || apiStatus === 'BUSY') return 'BUSY';
  if (apiStatus === 'ERROR') return 'ERROR';
  return 'IDLE';
}

export function AgentShowcase() {
  const { data: agents } = useAgents();
  const liveStatuses = useAgentStore((s) => s.liveStatuses);

  const { data: council } = useQuery({
    queryKey: ['council-pending'],
    queryFn: fetchCouncilPending,
    refetchInterval: 5000,
  });

  const activeRwaId = council?.inProgress[0]?.id ?? council?.pending[0]?.id;

  const { data: councilVotes } = useQuery({
    queryKey: ['council-votes', activeRwaId],
    queryFn: () => fetchCouncilVotes(activeRwaId!),
    enabled: !!activeRwaId,
    refetchInterval: 5000,
  });

  const voteMap = new Map(
    councilVotes?.votes
      .filter((v) => COUNCIL_VOTING_AGENT_IDS.includes(v.agentId as typeof COUNCIL_VOTING_AGENT_IDS[number]))
      .map((v) => [v.agentId, v]),
  );

  const showcaseAgents = COUNCIL_VOTING_AGENT_IDS.map((id) => {
    const agent = agents?.find((a) => a.id === id);
    const vote = voteMap.get(id);
    const hasVoted = Boolean(vote && vote.vote !== 'PENDING');
    const status = resolveAgentStatus(id, agent?.status, liveStatuses.get(id), hasVoted);

    return {
      id,
      name: AGENT_LABELS[id] ?? id,
      status,
    };
  });

  const votedCount = showcaseAgents.filter((a) => a.status === 'VOTED').length;
  const busyCount = showcaseAgents.filter((a) => a.status === 'BUSY').length;
  const hasActivity = Boolean(activeRwaId) || votedCount > 0 || busyCount > 0;

  return (
    <section className="py-20 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl font-bold text-text-primary mb-4"
        >
          Agent Council in Action
        </motion.h2>
        <p className="text-text-secondary mb-12">Watch the council deliberate in real time</p>

        <div className="rounded-2xl bg-bg-card border border-violet-500/[0.15] p-8">
          <div className="flex items-center justify-center gap-6 mb-6">
            {showcaseAgents.map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                className="flex flex-col items-center gap-2"
              >
                <AgentStatusOrb status={a.status} label={a.name} size="lg" />
                <span className="text-sm text-text-secondary">{a.name}</span>
                <span className="text-xs text-text-muted capitalize">{a.status.toLowerCase()}</span>
              </motion.div>
            ))}
          </div>

          <div className="rounded-lg bg-bg-elevated border border-violet-500/20 p-4 text-left max-w-md mx-auto">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-text-secondary">Council Consensus</span>
              <span className="text-sm font-mono text-violet-400">
                {hasActivity ? `${votedCount} of ${COUNCIL_VOTING_COUNT} voted` : 'Awaiting submission'}
              </span>
            </div>
            <div className="flex gap-1">
              {showcaseAgents.map((agent) => (
                <div
                  key={agent.id}
                  className={cn(
                    'h-2 flex-1 rounded-full transition-colors duration-300',
                    agent.status === 'VOTED' && 'bg-emerald-500',
                    agent.status === 'BUSY' && 'bg-violet-500 animate-pulse',
                    agent.status === 'ERROR' && 'bg-red-500',
                    agent.status === 'IDLE' && 'bg-bg-card',
                  )}
                />
              ))}
            </div>
            {!hasActivity && (
              <p className="text-xs text-text-muted mt-2">
                All agents idle — submit an RWA to start deliberation
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
