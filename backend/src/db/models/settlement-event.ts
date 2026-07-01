export type SettlementEventType = 'REPAYMENT' | 'YIELD_DISTRIBUTION' | 'LIQUIDATION' | 'PARTIAL_LIQUIDATION' | 'MATURITY';

export interface SettlementEventRow {
  id: string;
  rwa_id: string;
  event_type: SettlementEventType;
  amount: string;
  tx_hash: string | null;
  settled_at: Date;
}

export function rowToSettlementEvent(row: SettlementEventRow) {
  return {
    id: row.id,
    rwaId: row.rwa_id,
    eventType: row.event_type,
    amount: row.amount,
    txHash: row.tx_hash ?? undefined,
    settledAt: row.settled_at,
  };
}
