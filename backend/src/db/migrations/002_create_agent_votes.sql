CREATE TABLE IF NOT EXISTS agent_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rwa_id UUID NOT NULL REFERENCES rwa_submissions(id) ON DELETE CASCADE,
  agent_id VARCHAR(20) NOT NULL CHECK (agent_id IN ('orchestrator', 'risk', 'valuation', 'compliance', 'sentinel')),
  vote VARCHAR(10) NOT NULL CHECK (vote IN ('APPROVE', 'REJECT', 'ABSTAIN')),
  confidence NUMERIC(4, 3) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  reasoning TEXT NOT NULL,
  raw_data JSONB,
  processing_cost_motes VARCHAR(30),
  tx_hash VARCHAR(64),
  block_hash VARCHAR(64),
  voted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_votes_rwa_id ON agent_votes(rwa_id);
CREATE INDEX IF NOT EXISTS idx_votes_agent_id ON agent_votes(agent_id);
CREATE INDEX IF NOT EXISTS idx_votes_voted_at ON agent_votes(voted_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_votes_rwa_agent ON agent_votes(rwa_id, agent_id);
