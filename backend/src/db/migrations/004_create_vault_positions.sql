CREATE TABLE IF NOT EXISTS vault_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address VARCHAR(80) NOT NULL UNIQUE,
  lp_tokens NUMERIC(30, 0) NOT NULL DEFAULT 0,
  cspr_deposited NUMERIC(30, 0) NOT NULL DEFAULT 0,
  yield_earned NUMERIC(30, 0) NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vault_address ON vault_positions(address);
