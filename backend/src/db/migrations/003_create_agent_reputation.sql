CREATE TABLE IF NOT EXISTS agent_reputation (
  agent_id VARCHAR(20) PRIMARY KEY CHECK (agent_id IN ('orchestrator', 'risk', 'valuation', 'compliance', 'sentinel')),
  total_votes INTEGER NOT NULL DEFAULT 0,
  correct_calls INTEGER NOT NULL DEFAULT 0,
  reputation_score NUMERIC(5, 2) NOT NULL DEFAULT 50.00 CHECK (reputation_score >= 0 AND reputation_score <= 100),
  nft_token_id VARCHAR(100),
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed initial reputation rows for each agent
INSERT INTO agent_reputation (agent_id, reputation_score) VALUES
  ('risk', 50.00),
  ('valuation', 50.00),
  ('compliance', 50.00),
  ('sentinel', 50.00),
  ('orchestrator', 50.00)
ON CONFLICT (agent_id) DO NOTHING;
