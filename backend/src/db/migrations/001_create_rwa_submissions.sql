CREATE TABLE IF NOT EXISTS rwa_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_public_key VARCHAR(68) NOT NULL,
  asset_type VARCHAR(20) NOT NULL CHECK (asset_type IN ('INVOICE', 'PURCHASE_ORDER', 'TRADE_RECEIVABLE')),
  face_value NUMERIC(18, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  invoice_number VARCHAR(100),
  issuer_name VARCHAR(200) NOT NULL,
  issuer_country VARCHAR(2) NOT NULL,
  issuer_registration_number VARCHAR(100) NOT NULL,
  buyer_name VARCHAR(200) NOT NULL,
  buyer_country VARCHAR(2) NOT NULL,
  buyer_registration_number VARCHAR(100),
  issue_date TIMESTAMPTZ NOT NULL,
  due_date TIMESTAMPTZ NOT NULL,
  description TEXT,
  document_hash VARCHAR(64),
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (
    status IN ('PENDING', 'ANALYZING', 'VOTING', 'APPROVED', 'REJECTED', 'ACTIVE', 'MATURED', 'DEFAULTED', 'SETTLED')
  ),
  nft_token_id VARCHAR(100),
  mint_tx_hash VARCHAR(64),
  risk_score NUMERIC(5, 4),
  valuation_npv NUMERIC(18, 2),
  collateral_ratio NUMERIC(5, 4),
  compliance_clearance VARCHAR(10) CHECK (compliance_clearance IN ('CLEAR', 'FLAGGED', 'REJECTED')),
  final_decision_memo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rwa_owner ON rwa_submissions(owner_public_key);
CREATE INDEX IF NOT EXISTS idx_rwa_status ON rwa_submissions(status);
CREATE INDEX IF NOT EXISTS idx_rwa_asset_type ON rwa_submissions(asset_type);
CREATE INDEX IF NOT EXISTS idx_rwa_created_at ON rwa_submissions(created_at DESC);
