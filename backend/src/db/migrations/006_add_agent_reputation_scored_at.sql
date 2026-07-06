ALTER TABLE rwa_submissions
  ADD COLUMN IF NOT EXISTS agent_reputation_scored_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_rwa_reputation_scored
  ON rwa_submissions(agent_reputation_scored_at);