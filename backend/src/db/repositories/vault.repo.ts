import { query, queryOne } from '../index';
import { VaultPositionRow, rowToPosition } from '../models/vault-position';
import { SettlementEventRow, rowToSettlementEvent, SettlementEventType } from '../models/settlement-event';

export class VaultRepository {
  async subtractPosition(address: string, lpTokens: string, csprAmount: string) {
    const rows = await query<VaultPositionRow>(
      `UPDATE vault_positions SET
         lp_tokens = GREATEST(lp_tokens - $2, 0),
         cspr_deposited = GREATEST(cspr_deposited - $3, 0),
         last_updated = NOW()
       WHERE address = $1
       RETURNING *`,
      [address, lpTokens, csprAmount],
    );
    return rows[0] ? rowToPosition(rows[0]) : null;
  }

  async setPosition(address: string, lpTokens: string, csprDeposited: string) {
    const rows = await query<VaultPositionRow>(
      `INSERT INTO vault_positions (address, lp_tokens, cspr_deposited)
       VALUES ($1, $2, $3)
       ON CONFLICT (address) DO UPDATE SET
         lp_tokens = EXCLUDED.lp_tokens,
         cspr_deposited = EXCLUDED.cspr_deposited,
         last_updated = NOW()
       RETURNING *`,
      [address, lpTokens, csprDeposited],
    );
    return rowToPosition(rows[0]);
  }

  async upsertPosition(address: string, lpTokens: string, csprDeposited: string) {
    const rows = await query<VaultPositionRow>(
      `INSERT INTO vault_positions (address, lp_tokens, cspr_deposited)
       VALUES ($1, $2, $3)
       ON CONFLICT (address) DO UPDATE SET
         lp_tokens = vault_positions.lp_tokens + EXCLUDED.lp_tokens,
         cspr_deposited = vault_positions.cspr_deposited + EXCLUDED.cspr_deposited,
         last_updated = NOW()
       RETURNING *`,
      [address, lpTokens, csprDeposited],
    );
    return rowToPosition(rows[0]);
  }

  async getPosition(address: string) {
    const row = await queryOne<VaultPositionRow>(
      'SELECT * FROM vault_positions WHERE address = $1',
      [address],
    );
    return row ? rowToPosition(row) : null;
  }

  async getTVL(): Promise<{ totalCspr: string; totalPositions: number }> {
    const row = await queryOne<{ total_cspr: string; total_positions: string }>(
      'SELECT SUM(cspr_deposited)::TEXT as total_cspr, COUNT(*)::TEXT as total_positions FROM vault_positions',
    );
    return {
      totalCspr: row?.total_cspr ?? '0',
      totalPositions: parseInt(row?.total_positions ?? '0'),
    };
  }

  async getYieldAccrued(): Promise<string> {
    const row = await queryOne<{ total_yield: string }>(
      'SELECT SUM(yield_earned)::TEXT as total_yield FROM vault_positions',
    );
    return row?.total_yield ?? '0';
  }

  async addYield(address: string, yieldMotes: string) {
    const rows = await query<VaultPositionRow>(
      `UPDATE vault_positions SET yield_earned = yield_earned + $2, last_updated = NOW()
       WHERE address = $1 RETURNING *`,
      [address, yieldMotes],
    );
    return rows[0] ? rowToPosition(rows[0]) : null;
  }

  async recordSettlementEvent(params: {
    rwaId: string;
    eventType: SettlementEventType;
    amount: string;
    txHash?: string;
  }) {
    const rows = await query<SettlementEventRow>(
      `INSERT INTO settlement_events (rwa_id, event_type, amount, tx_hash)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [params.rwaId, params.eventType, params.amount, params.txHash ?? null],
    );
    return rowToSettlementEvent(rows[0]);
  }

  async getSettlementEvents(rwaId: string) {
    const rows = await query<SettlementEventRow>(
      'SELECT * FROM settlement_events WHERE rwa_id = $1 ORDER BY settled_at DESC',
      [rwaId],
    );
    return rows.map(rowToSettlementEvent);
  }
}

export const vaultRepo = new VaultRepository();
