import { rowToSubmission } from '../../db/models/rwa-submission';
import { rwaRepo } from '../../db/repositories/rwa.repo';
import {
  computeRiskDistribution,
  mapClaimsStatus,
  resolveAssetApy,
  resolveRiskLevel,
  type RiskLevelLabel,
} from './instrument-helpers';

export interface VaultInstrument {
  id: string;
  issuerName: string;
  buyerName: string;
  faceValue: number;
  currency: string;
  maturityDate: string;
  nftTokenId: string | null;
  assetApy: number;
  riskLevel: RiskLevelLabel;
  claimsStatus: string;
  status: string;
}

export interface VaultRiskDistribution {
  low: number;
  medium: number;
  high: number;
  instrumentCount: number;
}

export async function getVaultInstruments(poolApy = 0.09): Promise<VaultInstrument[]> {
  const rows = await rwaRepo.listVaultInstruments();

  return rows.map((row) => {
    const submission = rowToSubmission(row);
    const riskLevel = resolveRiskLevel(
      row.compliance_raw_data,
      submission.riskScore,
      row.risk_raw_data,
    );
    const assetApy = resolveAssetApy(row.risk_raw_data, row.valuation_raw_data, poolApy);

    return {
      id: submission.id,
      issuerName: submission.issuerName,
      buyerName: submission.buyerName,
      faceValue: submission.faceValue,
      currency: submission.currency,
      maturityDate:
        submission.dueDate instanceof Date
          ? submission.dueDate.toISOString().slice(0, 10)
          : String(submission.dueDate).slice(0, 10),
      nftTokenId: submission.nftTokenId ?? null,
      assetApy,
      riskLevel,
      claimsStatus: mapClaimsStatus(submission.status),
      status: submission.status,
    };
  });
}

export async function getVaultRiskDistribution(poolApy = 0.09): Promise<VaultRiskDistribution> {
  const instruments = await getVaultInstruments(poolApy);
  const distribution = computeRiskDistribution(
    instruments.map((instrument) => ({
      riskLevel: instrument.riskLevel,
      faceValue: instrument.faceValue,
    })),
  );

  return {
    ...distribution,
    instrumentCount: instruments.length,
  };
}
