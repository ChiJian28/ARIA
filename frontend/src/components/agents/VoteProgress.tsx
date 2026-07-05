import { cn } from '@/lib/cn';
import { COUNCIL_MIN_APPROVE, COUNCIL_MIN_REJECT } from '@/lib/constants';

interface VoteProgressProps {
  voted: number;
  total: number;
  approved: number;
  minApprove?: number;
  minReject?: number;
  consensusReached?: boolean;
  approvedConsensus?: boolean;
  summaryMessage?: string;
}

export function VoteProgress({
  voted,
  total,
  approved,
  minApprove = COUNCIL_MIN_APPROVE,
  minReject = COUNCIL_MIN_REJECT,
  consensusReached = false,
  approvedConsensus = false,
  summaryMessage,
}: VoteProgressProps) {
  const consensus = consensusReached ? approvedConsensus : approved >= minApprove;
  const rejected = voted - approved;
  const majorityRejected = consensusReached
    ? !approvedConsensus
    : rejected >= minReject;

  return (
    <div className="rounded-lg bg-bg-elevated border border-violet-500/20 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-text-secondary">Council Consensus</span>
        <span
          className={cn(
            'text-xs font-semibold',
            consensus ? 'text-emerald-400' : majorityRejected ? 'text-red-400' : 'text-violet-400',
          )}
        >
          {voted} of {total} voted
        </span>
      </div>
      <div className="flex gap-1">
        {[...Array(total)].map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-2 flex-1 rounded-full transition-colors duration-300',
              i < approved ? 'bg-emerald-500' : i < voted ? 'bg-red-500' : 'bg-bg-card',
            )}
          />
        ))}
      </div>
      {consensus && (
        <p className="text-xs text-emerald-400 mt-1.5 font-medium">
          {summaryMessage ?? '✓ Consensus reached — Approved'}
        </p>
      )}
      {majorityRejected && !consensus && (
        <p className="text-xs text-red-400 mt-1.5 font-medium">
          {summaryMessage ?? '✗ Consensus reached — Rejected'}
        </p>
      )}
    </div>
  );
}
