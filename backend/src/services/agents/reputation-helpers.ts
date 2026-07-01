import type { VoteDecision } from '../../utils/types/agent.types';

export type RwaOutcome = 'success' | 'failure';

/** Council agents that cast underwriting votes. */
export const COUNCIL_VOTING_AGENTS = ['risk', 'valuation', 'compliance'] as const;

/**
 * Whether an agent vote matched the realized RWA outcome.
 * - success (repaid/settled): APPROVE was correct
 * - failure (defaulted): REJECT was correct
 */
export function isVoteCorrect(vote: VoteDecision, outcome: RwaOutcome): boolean | null {
  if (vote === 'ABSTAIN') return null;
  if (outcome === 'success') return vote === 'APPROVE';
  return vote === 'REJECT';
}

export function computeReputationScore(correctCalls: number, totalVotes: number): number {
  if (totalVotes <= 0) return 50;
  return Math.round((correctCalls / totalVotes) * 100);
}
