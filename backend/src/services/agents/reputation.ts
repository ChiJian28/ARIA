import { agentRepo } from '../../db/repositories/agent.repo';
import { rwaRepo } from '../../db/repositories/rwa.repo';
import { updateAgentReputationOnChain } from '../../blockchain/contracts/rwa-registry';
import { resolveAgentPublicKeyHex } from '../../agents/base/signer';
import {
  COUNCIL_VOTING_AGENTS,
  isVoteCorrect,
  type RwaOutcome,
} from './reputation-helpers';
import type { AgentId } from '../../utils/types/agent.types';
import logger from '../../utils/logger';

export interface AgentReputationScoreResult {
  agentId: AgentId;
  vote: string;
  correct: boolean;
  reputationScore: number;
  correctCalls: number;
  totalVotes: number;
  onChainTxHash?: string;
}

export interface ScoreRwaReputationsResult {
  rwaId: string;
  outcome: RwaOutcome;
  skipped: boolean;
  agents: AgentReputationScoreResult[];
}

/**
 * Score council agent votes after an RWA reaches a terminal outcome.
 * Updates PostgreSQL reputation and best-effort syncs to RwaRegistry.update_reputation.
 */
export async function scoreAgentReputationsForRwa(
  rwaId: string,
  outcome: RwaOutcome,
): Promise<ScoreRwaReputationsResult> {
  const locked = await rwaRepo.lockForReputationScoring(rwaId);
  if (!locked) {
    logger.info('Agent reputation already scored for RWA', { rwa_id: rwaId });
    return { rwaId, outcome, skipped: true, agents: [] };
  }

  const votes = await agentRepo.getVotesByRwa(rwaId);
  const councilVotes = votes.filter((v) =>
    (COUNCIL_VOTING_AGENTS as readonly string[]).includes(v.agentId),
  );

  const results: AgentReputationScoreResult[] = [];

  for (const vote of councilVotes) {
    const correct = isVoteCorrect(vote.vote, outcome);
    if (correct === null) continue;

    const updated = await agentRepo.applyOutcomeScore(vote.agentId, correct);
    if (!updated) continue;

    let onChainTxHash: string | undefined;
    const agentPk = resolveAgentPublicKeyHex(vote.agentId);
    if (agentPk) {
      try {
        const chainResult = await updateAgentReputationOnChain(agentPk, correct);
        onChainTxHash = chainResult.deployHash;
      } catch (err) {
        logger.warn('On-chain reputation update failed (DB still updated)', {
          rwa_id: rwaId,
          agent_id: vote.agentId,
          error: (err as Error).message,
        });
      }
    }

    results.push({
      agentId: vote.agentId,
      vote: vote.vote,
      correct,
      reputationScore: updated.reputationScore,
      correctCalls: updated.correctCalls,
      totalVotes: updated.totalVotes,
      onChainTxHash,
    });
  }

  logger.info('Agent reputations scored for RWA', {
    rwa_id: rwaId,
    outcome,
    agentsScored: results.length,
  });

  return { rwaId, outcome, skipped: false, agents: results };
}
