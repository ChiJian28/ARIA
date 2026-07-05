'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import { orbPulse } from '@/lib/animations';
import type { AgentOrbState } from '@/hooks/useRwaCouncilSession';

interface AgentStatusOrbProps {
  status: string;
  label: string;
  orbState?: AgentOrbState;
  vote?: 'APPROVE' | 'REJECT';
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig: Record<string, { bg: string; ring: string; pulse: boolean }> = {
  IDLE: { bg: 'bg-text-muted', ring: 'ring-text-muted/30', pulse: false },
  idle: { bg: 'bg-text-muted', ring: 'ring-text-muted/30', pulse: false },
  BUSY: { bg: 'bg-violet-500', ring: 'ring-violet-500/40', pulse: true },
  thinking: { bg: 'bg-violet-500', ring: 'ring-violet-500/40', pulse: true },
  ERROR: { bg: 'bg-red-500', ring: 'ring-red-500/40', pulse: false },
  error: { bg: 'bg-red-500', ring: 'ring-red-500/40', pulse: false },
  ANALYZING: { bg: 'bg-violet-500', ring: 'ring-violet-500/40', pulse: true },
  VOTING: { bg: 'bg-violet-500', ring: 'ring-violet-500/40', pulse: true },
  VOTED: { bg: 'bg-teal-500', ring: 'ring-teal-500/40', pulse: false },
  voted: { bg: 'bg-teal-500', ring: 'ring-teal-500/40', pulse: false },
};

const sizes = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-base',
};

export function AgentStatusOrb({ status, label, orbState, vote, size = 'md' }: AgentStatusOrbProps) {
  const resolved = orbState ?? status.toLowerCase();
  const cfg = statusConfig[resolved] ?? statusConfig[status] ?? statusConfig.IDLE;
  const isThinking =
    resolved === 'thinking' || status === 'BUSY' || status === 'ANALYZING' || status === 'VOTING';
  const isVoted = resolved === 'voted' || status === 'VOTED';
  const isRejectVote = vote === 'REJECT';
  const isApproveVote = vote === 'APPROVE';

  return (
    <div className="relative shrink-0">
      <motion.div
        variants={orbPulse}
        animate={isThinking ? 'thinking' : 'idle'}
        className={cn(
          'relative flex items-center justify-center rounded-full ring-2 font-bold text-white',
          sizes[size],
          isVoted && isRejectVote
            ? 'bg-red-500 ring-red-500/50'
            : isVoted && isApproveVote
              ? 'bg-teal-500 ring-teal-500/50'
              : cfg.bg,
          isVoted ? '' : cfg.ring,
        )}
      >
        {isVoted && isApproveVote ? (
          <Check className="w-4 h-4" strokeWidth={3} />
        ) : isVoted && isRejectVote ? (
          '✗'
        ) : resolved === 'error' ? (
          '!'
        ) : (
          label.charAt(0).toUpperCase()
        )}
        {cfg.pulse && !isVoted && (
          <span className={cn('absolute inset-0 rounded-full animate-ping opacity-40', cfg.bg)} />
        )}
      </motion.div>
    </div>
  );
}
