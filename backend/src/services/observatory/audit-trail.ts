import { config } from '../../config';
import { rowToSubmission } from '../../db/models/rwa-submission';
import { rwaRepo } from '../../db/repositories/rwa.repo';
import { COUNCIL_VOTING_AGENTS } from '../agents/reputation-helpers';
import { resolveAssetApyOrNull } from '../vault/instrument-helpers';
import type { RwaStatus } from '../../utils/types/rwa.types';

export interface AuditTrailVoteSummary {
  total: number;
  approve: number;
  reject: number;
  councilSize: number;
  minApprove: number;
  consensusReached: boolean;
  /** Human-readable e.g. "2/3" (approve count over council size). */
  label: string;
}

export interface ObservatoryAuditTrailEntry {
  id: string;
  issuerName: string;
  buyerName: string;
  faceValue: number;
  currency: string;
  status: RwaStatus;
  createdAt: string;
  apy: number | null;
  voteSummary: AuditTrailVoteSummary;
}

function buildVoteSummary(
  approve: number,
  reject: number,
  total: number,
  councilSize: number,
  minApprove: number,
): AuditTrailVoteSummary {
  const consensusReached = approve >= minApprove || reject >= 2;
  return {
    total,
    approve,
    reject,
    councilSize,
    minApprove,
    consensusReached,
    label: `${approve}/${councilSize}`,
  };
}

export async function getObservatoryAuditTrail(
  limit = 20,
  offset = 0,
): Promise<ObservatoryAuditTrailEntry[]> {
  const councilSize = COUNCIL_VOTING_AGENTS.length;
  const minApprove = config.COUNCIL_MIN_VOTES;
  const rows = await rwaRepo.listAuditTrail(limit, offset);

  return rows.map((row) => {
    const submission = rowToSubmission(row);
    const apy = resolveAssetApyOrNull(row.risk_raw_data, row.valuation_raw_data);

    return {
      id: submission.id,
      issuerName: submission.issuerName,
      buyerName: submission.buyerName,
      faceValue: submission.faceValue,
      currency: submission.currency,
      status: submission.status,
      createdAt:
        submission.createdAt instanceof Date
          ? submission.createdAt.toISOString()
          : String(submission.createdAt),
      apy,
      voteSummary: buildVoteSummary(
        row.vote_approve,
        row.vote_reject,
        row.vote_total,
        councilSize,
        minApprove,
      ),
    };
  });
}
