import { AgentId } from '../../utils/types/agent.types';

export interface AgentReputationRow {
  agent_id: AgentId;
  total_votes: number;
  correct_calls: number;
  reputation_score: string;
  nft_token_id: string | null;
  last_updated: Date;
}

export function rowToReputation(row: AgentReputationRow) {
  return {
    agentId: row.agent_id,
    totalVotes: row.total_votes,
    correctCalls: row.correct_calls,
    reputationScore: parseFloat(row.reputation_score),
    nftTokenId: row.nft_token_id ?? undefined,
    lastUpdated: row.last_updated,
  };
}
