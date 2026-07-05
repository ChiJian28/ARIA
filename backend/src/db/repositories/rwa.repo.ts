import { query, queryOne } from '../index';
import { RwaSubmissionRow, rowToSubmission } from '../models/rwa-submission';
import { RwaStatus, RwaSubmission } from '../../utils/types/rwa.types';
import { RwaSubmissionInput } from '../../utils/validators';

export interface VaultInstrumentQueryRow extends RwaSubmissionRow {
  risk_raw_data: Record<string, unknown> | null;
  compliance_raw_data: Record<string, unknown> | null;
  valuation_raw_data: Record<string, unknown> | null;
}

export interface AuditTrailQueryRow extends RwaSubmissionRow {
  risk_raw_data: Record<string, unknown> | null;
  valuation_raw_data: Record<string, unknown> | null;
  vote_total: number;
  vote_approve: number;
  vote_reject: number;
}

export class RwaRepository {
  async create(input: RwaSubmissionInput, ownerPublicKey: string): Promise<RwaSubmission> {
    const rows = await query<RwaSubmissionRow>(
      `INSERT INTO rwa_submissions (
        owner_public_key, asset_type, face_value, currency, invoice_number,
        issuer_name, issuer_country, issuer_registration_number,
        buyer_name, buyer_country, buyer_registration_number,
        issue_date, due_date, description, document_hash, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'PENDING')
      RETURNING *`,
      [
        ownerPublicKey,
        input.assetType,
        input.faceValue,
        input.currency,
        input.invoiceNumber ?? null,
        input.issuerName,
        input.issuerCountry,
        input.issuerRegistrationNumber,
        input.buyerName,
        input.buyerCountry,
        input.buyerRegistrationNumber ?? null,
        input.issueDate,
        input.dueDate,
        input.description ?? null,
        input.documentHash ?? null,
      ],
    );
    return rowToSubmission(rows[0]);
  }

  async findById(id: string): Promise<RwaSubmission | null> {
    const row = await queryOne<RwaSubmissionRow>(
      'SELECT * FROM rwa_submissions WHERE id = $1',
      [id],
    );
    return row ? rowToSubmission(row) : null;
  }

  async updateStatus(id: string, status: RwaStatus, extra?: Partial<{
    nftTokenId: string;
    mintTxHash: string;
    collateralLockedMotes: string;
    lockTxHash: string;
    riskScore: number;
    valuationNpv: number;
    collateralRatio: number;
    complianceClearance: 'CLEAR' | 'FLAGGED' | 'REJECTED';
    finalDecisionMemo: string;
  }>): Promise<RwaSubmission | null> {
    const sets: string[] = ['status = $2', 'updated_at = NOW()'];
    const params: unknown[] = [id, status];
    let idx = 3;

    if (extra?.nftTokenId) { sets.push(`nft_token_id = $${idx++}`); params.push(extra.nftTokenId); }
    if (extra?.mintTxHash) { sets.push(`mint_tx_hash = $${idx++}`); params.push(extra.mintTxHash); }
    if (extra?.collateralLockedMotes) { sets.push(`collateral_locked_motes = $${idx++}`); params.push(extra.collateralLockedMotes); }
    if (extra?.lockTxHash) { sets.push(`lock_tx_hash = $${idx++}`); params.push(extra.lockTxHash); }
    if (extra?.riskScore !== undefined) { sets.push(`risk_score = $${idx++}`); params.push(extra.riskScore); }
    if (extra?.valuationNpv !== undefined) { sets.push(`valuation_npv = $${idx++}`); params.push(extra.valuationNpv); }
    if (extra?.collateralRatio !== undefined) { sets.push(`collateral_ratio = $${idx++}`); params.push(extra.collateralRatio); }
    if (extra?.complianceClearance) { sets.push(`compliance_clearance = $${idx++}`); params.push(extra.complianceClearance); }
    if (extra?.finalDecisionMemo) { sets.push(`final_decision_memo = $${idx++}`); params.push(extra.finalDecisionMemo); }

    const rows = await query<RwaSubmissionRow>(
      `UPDATE rwa_submissions SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
      params,
    );
    return rows[0] ? rowToSubmission(rows[0]) : null;
  }

  async setNftTokenId(id: string, nftTokenId: string): Promise<void> {
    await query(
      `UPDATE rwa_submissions
       SET nft_token_id = $2, updated_at = NOW()
       WHERE id = $1 AND (nft_token_id IS NULL OR nft_token_id = '')`,
      [id, nftTokenId],
    );
  }

  async listByOwner(ownerPublicKey: string, limit = 20, offset = 0): Promise<RwaSubmission[]> {
    const rows = await query<RwaSubmissionRow>(
      'SELECT * FROM rwa_submissions WHERE owner_public_key = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [ownerPublicKey, limit, offset],
    );
    return rows.map(rowToSubmission);
  }

  async listPending(): Promise<RwaSubmission[]> {
    const rows = await query<RwaSubmissionRow>(
      "SELECT * FROM rwa_submissions WHERE status = 'PENDING' ORDER BY created_at ASC",
    );
    return rows.map(rowToSubmission);
  }

  async listActive(): Promise<RwaSubmission[]> {
    const rows = await query<RwaSubmissionRow>(
      "SELECT * FROM rwa_submissions WHERE status = 'ACTIVE' ORDER BY due_date ASC",
    );
    return rows.map(rowToSubmission);
  }

  async getTotalLockedCollateralMotes(): Promise<string> {
    const row = await queryOne<{ total: string }>(
      `SELECT COALESCE(SUM(collateral_locked_motes::numeric), 0)::TEXT AS total
       FROM rwa_submissions
       WHERE collateral_locked_motes IS NOT NULL`,
    );
    return row?.total ?? '0';
  }

  async countCollateralClaims(): Promise<number> {
    const row = await queryOne<{ count: string }>(
      `SELECT COUNT(*)::TEXT AS count
       FROM rwa_submissions
       WHERE collateral_locked_motes IS NOT NULL
         AND collateral_locked_motes::numeric > 0`,
    );
    return parseInt(row?.count ?? '0', 10);
  }

  async clearCollateralLock(id: string): Promise<void> {
    await query(
      `UPDATE rwa_submissions
       SET collateral_locked_motes = NULL, lock_tx_hash = NULL, updated_at = NOW()
       WHERE id = $1`,
      [id],
    );
  }

  async listVaultInstruments(): Promise<VaultInstrumentQueryRow[]> {
    return query<VaultInstrumentQueryRow>(
      `SELECT rs.*,
        rv.raw_data AS risk_raw_data,
        cv.raw_data AS compliance_raw_data,
        vv.raw_data AS valuation_raw_data
      FROM rwa_submissions rs
      LEFT JOIN agent_votes rv ON rv.rwa_id = rs.id AND rv.agent_id = 'risk'
      LEFT JOIN agent_votes cv ON cv.rwa_id = rs.id AND cv.agent_id = 'compliance'
      LEFT JOIN agent_votes vv ON vv.rwa_id = rs.id AND vv.agent_id = 'valuation'
      WHERE rs.status IN ('ACTIVE', 'SETTLED', 'MATURED', 'APPROVED')
      ORDER BY rs.due_date ASC`,
    );
  }

  async listAll(limit = 20, offset = 0): Promise<RwaSubmission[]> {
    const rows = await query<RwaSubmissionRow>(
      'SELECT * FROM rwa_submissions ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset],
    );
    return rows.map(rowToSubmission);
  }

  async listAuditTrail(limit = 20, offset = 0): Promise<AuditTrailQueryRow[]> {
    return query<AuditTrailQueryRow>(
      `SELECT rs.*,
        rv.raw_data AS risk_raw_data,
        vv.raw_data AS valuation_raw_data,
        COALESCE(vs.vote_total, 0)::int AS vote_total,
        COALESCE(vs.vote_approve, 0)::int AS vote_approve,
        COALESCE(vs.vote_reject, 0)::int AS vote_reject
      FROM rwa_submissions rs
      LEFT JOIN agent_votes rv ON rv.rwa_id = rs.id AND rv.agent_id = 'risk'
      LEFT JOIN agent_votes vv ON vv.rwa_id = rs.id AND vv.agent_id = 'valuation'
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*)::int AS vote_total,
          COUNT(*) FILTER (WHERE vote = 'APPROVE')::int AS vote_approve,
          COUNT(*) FILTER (WHERE vote = 'REJECT')::int AS vote_reject
        FROM agent_votes
        WHERE rwa_id = rs.id AND agent_id IN ('risk', 'valuation', 'compliance')
      ) vs ON true
      ORDER BY rs.created_at DESC
      LIMIT $1 OFFSET $2`,
      [limit, offset],
    );
  }

  /** Idempotent lock — returns true if this call claimed scoring for the RWA. */
  async lockForReputationScoring(id: string): Promise<boolean> {
    const rows = await query<{ id: string }>(
      `UPDATE rwa_submissions
       SET agent_reputation_scored_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND agent_reputation_scored_at IS NULL
       RETURNING id`,
      [id],
    );
    return rows.length > 0;
  }
}

export const rwaRepo = new RwaRepository();
