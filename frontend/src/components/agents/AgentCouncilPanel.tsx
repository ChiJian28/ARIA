'use client';

import { motion } from 'framer-motion';
import { stagger } from '@/lib/animations';
import { AgentCard } from './AgentCard';
import { VoteProgress } from './VoteProgress';
import { Skeleton } from '@/components/ui/skeleton';
import { useAgents } from '@/hooks/useAgents';
import { useRwaVotes } from '@/hooks/useRwa';
import { useAgentStore } from '@/store/agent.store';
import { deriveCouncilOutcome, normalizeAgentLiveStatus, resolveCouncilVotes } from '@/lib/council-display';
import { COUNCIL_VOTING_COUNT, COUNCIL_VOTING_AGENT_IDS } from '@/lib/constants';
import type { AgentVote, AgentInfo, RwaStatus } from '@/types/api.types';

interface AgentCouncilPanelProps {
  votes?: AgentVote[];
  rwaId?: string;
  rwaStatus?: RwaStatus;
  nftTokenId?: string | null;
  mintTxHash?: string | null;
  finalDecisionMemo?: string;
  onAgentClick?: (agentId: string, vote?: AgentVote) => void;
}

function getCouncilVotingAgents(agents: AgentInfo[] | undefined): AgentInfo[] {
  if (!agents?.length) return [];

  const votingAgents = agents.filter((agent) => agent.voteWeight > 0);
  if (votingAgents.length > 0) {
    return COUNCIL_VOTING_AGENT_IDS
      .map((id) => votingAgents.find((agent) => agent.id === id))
      .filter((agent): agent is AgentInfo => Boolean(agent));
  }

  return COUNCIL_VOTING_AGENT_IDS
    .map((id) => agents.find((agent) => agent.id === id))
    .filter((agent): agent is AgentInfo => Boolean(agent));
}

export function AgentCouncilPanel({
  votes,
  rwaId,
  rwaStatus,
  nftTokenId,
  mintTxHash,
  finalDecisionMemo,
  onAgentClick,
}: AgentCouncilPanelProps) {
  const { data: agents, isLoading } = useAgents();
  const liveStatuses = useAgentStore((s) => s.liveStatuses);
  const { data: liveVotes } = useRwaVotes(rwaId ?? '');

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[...Array(COUNCIL_VOTING_COUNT)].map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    );
  }

  const councilAgents = getCouncilVotingAgents(agents);
  const rawVotes = liveVotes ?? votes;
  const effectiveVotes = resolveCouncilVotes(rawVotes, rwaStatus);
  const outcome = deriveCouncilOutcome(effectiveVotes, rwaStatus, { nftTokenId, mintTxHash, finalDecisionMemo });
  const voteMap = new Map(effectiveVotes?.map((v) => [v.agentId, v]));
  const councilVotes = effectiveVotes?.filter((v) =>
    COUNCIL_VOTING_AGENT_IDS.includes(v.agentId as (typeof COUNCIL_VOTING_AGENT_IDS)[number]),
  ) ?? [];
  const approvedCount = councilVotes.filter((v) => v.vote === 'APPROVE').length;
  const totalVoted = councilVotes.filter((v) => v.vote !== 'PENDING').length;
  const councilSize = councilAgents.length || COUNCIL_VOTING_COUNT;
  const showProgress = Boolean(effectiveVotes?.length || rwaStatus);

  return (
    <div className="space-y-4">
      {showProgress && (
        <VoteProgress
          voted={totalVoted}
          total={councilSize}
          approved={approvedCount}
          consensusReached={outcome.consensusReached}
          approvedConsensus={outcome.councilApproved}
          summaryMessage={outcome.summaryMessage}
        />
      )}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 gap-3"
      >
        {councilAgents.map((agent) => {
          const vote = voteMap.get(agent.id);
          const displayStatus = normalizeAgentLiveStatus(
            agent.status,
            liveStatuses.get(agent.id),
            vote,
            rwaStatus,
          );
          return (
            <AgentCard
              key={agent.id}
              agent={agent}
              vote={vote}
              liveStatus={displayStatus}
              onClick={() => onAgentClick?.(agent.id, vote)}
            />
          );
        })}
      </motion.div>
    </div>
  );
}
