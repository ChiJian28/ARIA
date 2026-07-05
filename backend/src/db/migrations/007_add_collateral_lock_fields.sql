ALTER TABLE rwa_submissions
  ADD COLUMN IF NOT EXISTS collateral_locked_motes VARCHAR(78),
  ADD COLUMN IF NOT EXISTS lock_tx_hash VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_rwa_collateral_locked
  ON rwa_submissions (collateral_locked_motes)
  WHERE collateral_locked_motes IS NOT NULL;
