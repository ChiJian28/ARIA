'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';
import { COUNCIL_MIN_APPROVE, COUNCIL_VOTING_COUNT } from '@/lib/constants';

interface ConsensusProgressProps {
  approveCount: number;
  total?: number;
  minApprove?: number;
  consensusReached: boolean;
  approved: boolean;
}

export function ConsensusProgress({
  approveCount,
  total = COUNCIL_VOTING_COUNT,
  minApprove = COUNCIL_MIN_APPROVE,
  consensusReached,
  approved,
}: ConsensusProgressProps) {
  const progress = Math.min(1, approveCount / minApprove);
  const circumference = 2 * Math.PI * 42;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className="relative flex flex-col items-center justify-center">
      <svg width="112" height="112" viewBox="0 0 100 100" className="-rotate-90">
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          className="text-bg-elevated"
        />
        <motion.circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          className={cn(
            consensusReached && approved ? 'text-teal-400' : 'text-violet-500',
          )}
          stroke="currentColor"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{
            strokeDasharray: circumference,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
        <span className="text-[10px] uppercase tracking-widest text-text-muted">Consensus</span>
        <span className="text-lg font-mono font-bold text-text-primary">
          {approveCount}/{total}
        </span>
        <span
          className={cn(
            'text-[10px] font-medium',
            consensusReached && approved
              ? 'text-teal-400'
              : consensusReached
                ? 'text-red-400'
                : 'text-violet-400',
          )}
        >
          {consensusReached
            ? approved
              ? 'Reached ✓'
              : 'Rejected'
            : `${minApprove} needed`}
        </span>
      </div>
    </div>
  );
}
