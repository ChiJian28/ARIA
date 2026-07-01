import { AgentId, VoteDecision } from '../../utils/types/agent.types';

export interface AgentVoteRow {
  id: string;
  rwa_id: string;
  agent_id: AgentId;
  vote: VoteDecision;
  confidence: string;
  reasoning: string;
  raw_data: Record<string, unknown> | null;
  processing_cost_motes: string | null;
  tx_hash: string | null;
  block_hash: string | null;
  voted_at: Date;
}

export function rowToVote(row: AgentVoteRow) {
  return {
    id: row.id,
    rwaId: row.rwa_id,
    agentId: row.agent_id,
    vote: row.vote,
    confidence: parseFloat(row.confidence),
    reasoning: row.reasoning,
    rawData: row.raw_data ?? undefined,
    processingCostMotes: row.processing_cost_motes ?? undefined,
    txHash: row.tx_hash ?? undefined,
    blockHash: row.block_hash ?? undefined,
    votedAt: row.voted_at,
  };
}
