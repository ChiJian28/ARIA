export interface VaultPositionRow {
  id: string;
  address: string;
  lp_tokens: string;
  cspr_deposited: string;
  yield_earned: string;
  last_updated: Date;
}

export function rowToPosition(row: VaultPositionRow) {
  return {
    id: row.id,
    address: row.address,
    lpTokens: row.lp_tokens,
    csprDeposited: row.cspr_deposited,
    yieldEarned: row.yield_earned,
    lastUpdated: row.last_updated,
  };
}
