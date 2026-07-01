CREATE TABLE IF NOT EXISTS settlement_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rwa_id UUID NOT NULL REFERENCES rwa_submissions(id),
  event_type VARCHAR(30) NOT NULL CHECK (
    event_type IN ('REPAYMENT', 'YIELD_DISTRIBUTION', 'LIQUIDATION', 'PARTIAL_LIQUIDATION', 'MATURITY')
  ),
  amount NUMERIC(30, 0) NOT NULL,
  tx_hash VARCHAR(64),
  settled_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_settlement_rwa_id ON settlement_events(rwa_id);
CREATE INDEX IF NOT EXISTS idx_settlement_event_type ON settlement_events(event_type);
CREATE INDEX IF NOT EXISTS idx_settlement_settled_at ON settlement_events(settled_at DESC);
