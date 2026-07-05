'use client';

import { motion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';
import { scaleIn } from '@/lib/animations';
import { AgentStatusOrb } from './AgentStatusOrb';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/cn';
import { confidenceToPercent } from '@/lib/formatters';
import { explorerDeployUrl } from '@/lib/explorer';
import type { AgentInfo, AgentVote } from '@/types/api.types';

interface AgentCardProps {
  agent: AgentInfo;
  vote?: AgentVote;
  liveStatus?: string;
  onClick?: () => void;
}

const voteColor: Record<string, string> = {
  APPROVE: 'approved',
  REJECT: 'rejected',
  PENDING: 'pending',
};

function statusLabel(status: string, vote?: AgentVote): string {
  if (vote?.vote === 'APPROVE') return 'Approved';
  if (vote?.vote === 'REJECT') return 'Rejected';
  if (status === 'BUSY' || status === 'ANALYZING' || status === 'VOTING') return 'Analyzing…';
  if (status === 'VOTED') return 'Voted';
  if (status === 'ERROR') return 'Error';
  return status.toLowerCase();
}

export function AgentCard({ agent, vote, liveStatus, onClick }: AgentCardProps) {
  const status = liveStatus ?? agent.status;
  const isActive = status === 'BUSY';
  const confidencePercent = vote ? confidenceToPercent(vote.confidence) : 0;
  const hasVote = vote && vote.vote !== 'PENDING';

  return (
    <motion.div
      variants={scaleIn}
      onClick={onClick}
      className={cn(
        'relative rounded-xl bg-bg-card border p-4 cursor-pointer transition-all duration-200 overflow-hidden',
        isActive
          ? 'border-violet-500/60 shadow-lg shadow-violet-500/10'
          : 'border-violet-500/15 hover:border-violet-500/30',
      )}
    >
      {hasVote && vote.txHash && (
        <a
          href={explorerDeployUrl(vote.txHash)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="absolute top-3 right-3 inline-flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300 transition-colors z-10"
        >
          <ExternalLink className="w-3 h-3 shrink-0" />
          Explorer
        </a>
      )}
      <div className="flex items-start gap-3 mb-3 min-w-0 pr-16">
        <AgentStatusOrb
          status={status}
          label={agent.name}
          size="md"
          vote={hasVote && vote.vote !== 'PENDING' ? vote.vote : undefined}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text-primary leading-tight truncate">{agent.name}</p>
          <p className="text-xs text-text-muted mt-0.5 capitalize">{statusLabel(status, vote)}</p>
          {hasVote && (
            <Badge
              variant={voteColor[vote.vote] as 'approved' | 'rejected' | 'pending'}
              className="mt-2"
            >
              {vote.vote === 'APPROVE' ? 'Approve' : 'Reject'}
            </Badge>
          )}
        </div>
      </div>

      {hasVote && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-text-secondary">
            <span>Confidence</span>
            <span className="font-mono text-text-primary">{confidencePercent}%</span>
          </div>
          <Progress value={confidencePercent} />
        </div>
      )}

      {!vote && agent.reputation && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-text-secondary">
            <span>Reputation</span>
            <span className="font-mono text-text-primary">{agent.reputation.reputationScore}/100</span>
          </div>
          <Progress value={agent.reputation.reputationScore} />
        </div>
      )}
    </motion.div>
  );
}
