import { query, queryOne } from '../index';
import { AgentVoteRow, rowToVote } from '../models/agent-vote';
import { AgentReputationRow, rowToReputation } from '../models/agent-reputation';
import { AgentId, VoteDecision } from '../../utils/types/agent.types';

export interface SaveVoteParams {
  rwaId: string;
  agentId: AgentId;
  vote: VoteDecision;
  confidence: number;
  reasoning: string;
  rawData?: Record<string, unknown>;
  processingCostMotes?: string;
  txHash?: string;
  blockHash?: string;
}

export class AgentRepository {
  async saveVote(params: SaveVoteParams) {
    const rows = await query<AgentVoteRow>(
      `INSERT INTO agent_votes (rwa_id, agent_id, vote, confidence, reasoning, raw_data, processing_cost_motes, tx_hash, block_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (rwa_id, agent_id) DO UPDATE SET
         vote = EXCLUDED.vote,
         confidence = EXCLUDED.confidence,
         reasoning = EXCLUDED.reasoning,
         raw_data = EXCLUDED.raw_data,
         processing_cost_motes = EXCLUDED.processing_cost_motes,
         tx_hash = EXCLUDED.tx_hash,
         block_hash = EXCLUDED.block_hash,
         voted_at = NOW()
       RETURNING *`,
      [
        params.rwaId,
        params.agentId,
        params.vote,
        params.confidence,
        params.reasoning,
        params.rawData ? JSON.stringify(params.rawData) : null,
        params.processingCostMotes ?? null,
        params.txHash ?? null,
        params.blockHash ?? null,
      ],
    );
    return rowToVote(rows[0]);
  }

  async getVotesByRwa(rwaId: string) {
    const rows = await query<AgentVoteRow>(
      'SELECT * FROM agent_votes WHERE rwa_id = $1 ORDER BY voted_at ASC',
      [rwaId],
    );
    return rows.map(rowToVote);
  }

  async getReputation(agentId: AgentId) {
    const row = await queryOne<AgentReputationRow>(
      'SELECT * FROM agent_reputation WHERE agent_id = $1',
      [agentId],
    );
    return row ? rowToReputation(row) : null;
  }

  async getAllReputations() {
    const rows = await query<AgentReputationRow>(
      'SELECT * FROM agent_reputation ORDER BY reputation_score DESC',
    );
    return rows.map(rowToReputation);
  }

  /** Apply settlement outcome: bump correctCalls when warranted and recalculate score from accuracy. */
  async applyOutcomeScore(agentId: AgentId, correct: boolean) {
    const increment = correct ? 1 : 0;
    const rows = await query<AgentReputationRow>(
      `UPDATE agent_reputation SET
        correct_calls = correct_calls + $2,
        reputation_score = LEAST(100, GREATEST(0,
          ROUND(((correct_calls + $2)::numeric / NULLIF(total_votes, 0)) * 100)
        )),
        last_updated = NOW()
       WHERE agent_id = $1
       RETURNING *`,
      [agentId, increment],
    );
    return rows[0] ? rowToReputation(rows[0]) : null;
  }

  async updateReputation(
    agentId: AgentId,
    increment: { totalVotes?: number; correctCalls?: number; reputationScore?: number; nftTokenId?: string },
  ) {
    const sets: string[] = ['last_updated = NOW()'];
    const params: unknown[] = [agentId];
    let idx = 2;

    if (increment.totalVotes !== undefined) {
      sets.push(`total_votes = total_votes + $${idx++}`);
      params.push(increment.totalVotes);
    }
    if (increment.correctCalls !== undefined) {
      sets.push(`correct_calls = correct_calls + $${idx++}`);
      params.push(increment.correctCalls);
    }
    if (increment.reputationScore !== undefined) {
      sets.push(`reputation_score = LEAST(100, GREATEST(0, reputation_score + $${idx++}))`);
      params.push(increment.reputationScore);
    }
    if (increment.nftTokenId !== undefined) {
      sets.push(`nft_token_id = $${idx++}`);
      params.push(increment.nftTokenId);
    }

    const rows = await query<AgentReputationRow>(
      `UPDATE agent_reputation SET ${sets.join(', ')} WHERE agent_id = $1 RETURNING *`,
      params,
    );
    return rows[0] ? rowToReputation(rows[0]) : null;
  }

  async getRecentVoteHistory(agentId: AgentId, limit = 20) {
    const rows = await query<AgentVoteRow & { rwa_status: string }>(
      `SELECT av.*, rs.status as rwa_status
       FROM agent_votes av
       JOIN rwa_submissions rs ON rs.id = av.rwa_id
       WHERE av.agent_id = $1
       ORDER BY av.voted_at DESC
       LIMIT $2`,
      [agentId, limit],
    );
    return rows.map((r) => ({ ...rowToVote(r), rwaStatus: r.rwa_status }));
  }
}

export const agentRepo = new AgentRepository();
