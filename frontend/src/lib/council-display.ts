import type { AgentVote, RwaStatus } from '@/types/api.types';
import { COUNCIL_MIN_APPROVE, COUNCIL_MIN_REJECT, COUNCIL_VOTING_AGENT_IDS } from '@/lib/constants';

const ACTIVE_RWA_STATUSES = new Set<RwaStatus>(['PENDING', 'ANALYZING', 'VOTING']);
const TERMINAL_RWA_STATUSES = new Set<RwaStatus>(['APPROVED', 'REJECTED', 'SETTLED', 'DEFAULTED']);

export interface CouncilOutcome {
  /** True when agent votes (or RWA status) indicate council approval */
  councilApproved: boolean;
  /** Council approved but CEP-78 NFT not yet on-chain */
  mintPending: boolean;
  consensusReached: boolean;
  summaryMessage?: string;
}

function countVotes(votes: AgentVote[] | undefined) {
  const councilVotes =
    votes?.filter((v) =>
      COUNCIL_VOTING_AGENT_IDS.includes(v.agentId as (typeof COUNCIL_VOTING_AGENT_IDS)[number]),
    ) ?? [];
  const approveCount = councilVotes.filter((v) => v.vote === 'APPROVE').length;
  const rejectCount = councilVotes.filter((v) => v.vote === 'REJECT').length;
  const votedCount = councilVotes.filter((v) => v.vote !== 'PENDING').length;
  return { councilVotes, approveCount, rejectCount, votedCount };
}

function deriveCouncilOutcomeFromCounts(
  approveCount: number,
  rejectCount: number,
  votedCount: number,
  rwaStatus?: RwaStatus,
  opts?: { nftTokenId?: string | null; mintTxHash?: string | null; finalDecisionMemo?: string },
): CouncilOutcome {
  const votesApproved = approveCount >= COUNCIL_MIN_APPROVE;
  const votesRejected = rejectCount >= COUNCIL_MIN_REJECT;
  const hasNft = Boolean(opts?.mintTxHash || opts?.nftTokenId);
  const memo = opts?.finalDecisionMemo ?? '';

  const councilApproved =
    votesApproved ||
    rwaStatus === 'APPROVED' ||
    rwaStatus === 'SETTLED' ||
    rwaStatus === 'ACTIVE';
  const councilRejected =
    !councilApproved && (votesRejected || rwaStatus === 'REJECTED' || rwaStatus === 'DEFAULTED');

  const mintPending =
    councilApproved &&
    !hasNft &&
    (memo.includes('NFT mint') ||
      memo.includes('Pipeline failed') ||
      memo.includes('pipeline step failed') ||
      rwaStatus === 'REJECTED');

  const consensusReached =
    Boolean(rwaStatus && TERMINAL_RWA_STATUSES.has(rwaStatus)) ||
    votesApproved ||
    votesRejected ||
    votedCount >= COUNCIL_VOTING_AGENT_IDS.length;

  let summaryMessage: string | undefined;
  if (councilApproved && mintPending) {
    summaryMessage = 'Council approved · NFT mint pending (on-chain step failed)';
  } else if (councilRejected) {
    summaryMessage = 'Council rejected this submission';
  }

  return {
    councilApproved,
    mintPending,
    consensusReached,
    summaryMessage,
  };
}

/**
 * Derive display consensus from agent votes first, then RWA status.
 * Fixes mismatch when pipeline worker wrongly marked REJECTED after council approved but mint failed.
 */
export function deriveCouncilOutcome(
  votes: AgentVote[] | undefined,
  rwaStatus?: RwaStatus,
  opts?: { nftTokenId?: string | null; mintTxHash?: string | null; finalDecisionMemo?: string },
): CouncilOutcome {
  const { approveCount, rejectCount, votedCount } = countVotes(votes);
  return deriveCouncilOutcomeFromCounts(approveCount, rejectCount, votedCount, rwaStatus, opts);
}

export type AuditTrailDecision = 'APPROVED' | 'REJECTED' | 'UNDER_AUDIT';

/** Align audit-trail Decision column with RWA detail modal (status + vote summary). */
export function resolveAuditTrailDecision(
  status: RwaStatus,
  voteSummary: { approve: number; reject: number; total: number },
): AuditTrailDecision {
  const outcome = deriveCouncilOutcomeFromCounts(
    voteSummary.approve,
    voteSummary.reject,
    voteSummary.total,
    status,
  );
  const display = effectiveRwaDisplayStatus(status, outcome);
  if (display === 'APPROVED' || display === 'SETTLED' || display === 'ACTIVE') return 'APPROVED';
  if (display === 'REJECTED' || display === 'DEFAULTED') return 'REJECTED';
  return 'UNDER_AUDIT';
}

export function formatAuditTrailVoteLabel(
  voteSummary: { total: number; councilSize: number },
  decision: AuditTrailDecision,
): string {
  const { total, councilSize } = voteSummary;
  if (total === 0 && decision !== 'UNDER_AUDIT') return '—';
  return `${total}/${councilSize}`;
}

/** When DB has no vote rows but RWA already decided, show sensible council UI. */
export function resolveCouncilVotes(
  votes: AgentVote[] | undefined,
  rwaStatus?: RwaStatus,
): AgentVote[] | undefined {
  if (!votes?.length && rwaStatus && TERMINAL_RWA_STATUSES.has(rwaStatus)) {
    const decision = rwaStatus === 'APPROVED' || rwaStatus === 'SETTLED' ? 'APPROVE' : 'REJECT';
    return COUNCIL_VOTING_AGENT_IDS.map((agentId) => ({
      agentId,
      vote: decision,
      confidence: decision === 'REJECT' ? 0 : 0.85,
      reasoning:
        decision === 'REJECT'
          ? 'Council rejected this submission (agents may have failed before recording individual votes).'
          : 'Council approved this submission.',
      txHash: null,
      votedAt: new Date().toISOString(),
    }));
  }
  return votes;
}

export function normalizeAgentLiveStatus(
  agentStatus: string | undefined,
  liveStatus: string | undefined,
  vote: AgentVote | undefined,
  rwaStatus?: RwaStatus,
): string {
  if (vote?.vote === 'APPROVE' || vote?.vote === 'REJECT') return 'VOTED';

  if (liveStatus === 'BUSY' || liveStatus === 'VOTED') return liveStatus;

  if (agentStatus === 'ANALYZING' || agentStatus === 'VOTING') return 'BUSY';
  if (agentStatus === 'ERROR') return 'ERROR';

  if (rwaStatus && ACTIVE_RWA_STATUSES.has(rwaStatus)) return 'BUSY';

  return liveStatus ?? agentStatus ?? 'IDLE';
}

export function isRwaCouncilActive(rwaStatus?: RwaStatus): boolean {
  return Boolean(rwaStatus && ACTIVE_RWA_STATUSES.has(rwaStatus));
}

/** Effective status badge for RWA header when votes and DB status disagree */
export function effectiveRwaDisplayStatus(
  rwaStatus: RwaStatus,
  outcome: CouncilOutcome,
): RwaStatus {
  if (outcome.councilApproved) return 'APPROVED';
  if (outcome.consensusReached && !outcome.councilApproved) return 'REJECTED';
  return rwaStatus;
}
