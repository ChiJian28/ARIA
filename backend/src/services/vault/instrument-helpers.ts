import type { RwaStatus } from '../../utils/types/rwa.types';

export type RiskLevelLabel = 'Low' | 'Medium' | 'High';

export function resolveRiskLevel(
  complianceRaw?: Record<string, unknown> | null,
  riskScore?: number,
  riskRaw?: Record<string, unknown> | null,
): RiskLevelLabel {
  const fromCompliance = complianceRaw?.riskLevel;
  if (fromCompliance === 'LOW') return 'Low';
  if (fromCompliance === 'MEDIUM') return 'Medium';
  if (fromCompliance === 'HIGH') return 'High';

  if (riskScore !== undefined && riskScore !== null && !Number.isNaN(riskScore)) {
    if (riskScore < 0.1) return 'Low';
    if (riskScore < 0.25) return 'Medium';
    return 'High';
  }

  const tier = riskRaw?.riskTier;
  if (tier === 'A' || tier === 'B') return 'Low';
  if (tier === 'C') return 'Medium';
  if (tier === 'D') return 'High';

  return 'Medium';
}

export function resolveAssetApy(
  riskRaw?: Record<string, unknown> | null,
  valuationRaw?: Record<string, unknown> | null,
  poolApy = 0.09,
): number {
  const suggested = riskRaw?.suggestedRate;
  if (typeof suggested === 'number' && suggested > 0) {
    return Math.round(suggested * 1000) / 10;
  }

  const discount = valuationRaw?.discountRate;
  if (typeof discount === 'number' && discount > 0) {
    return Math.round(discount * 1000) / 10;
  }

  return Math.round(poolApy * 1000) / 10;
}

/** APY from agent vote raw data only; null when underwriting has not produced a rate yet. */
export function resolveAssetApyOrNull(
  riskRaw?: Record<string, unknown> | null,
  valuationRaw?: Record<string, unknown> | null,
): number | null {
  const suggested = riskRaw?.suggestedRate;
  if (typeof suggested === 'number' && suggested > 0) {
    return Math.round(suggested * 1000) / 10;
  }

  const discount = valuationRaw?.discountRate;
  if (typeof discount === 'number' && discount > 0) {
    return Math.round(discount * 1000) / 10;
  }

  return null;
}

export function mapClaimsStatus(status: RwaStatus): 'Active' | 'Repaid' | string {
  switch (status) {
    case 'ACTIVE':
    case 'APPROVED':
      return 'Active';
    case 'SETTLED':
    case 'MATURED':
      return 'Repaid';
    default:
      return status;
  }
}

export function computeRiskDistribution(
  instruments: { riskLevel: RiskLevelLabel; faceValue: number }[],
): { low: number; medium: number; high: number } {
  if (instruments.length === 0) {
    return { low: 40, medium: 45, high: 15 };
  }

  let low = 0;
  let medium = 0;
  let high = 0;
  let total = 0;

  for (const inv of instruments) {
    total += inv.faceValue;
    if (inv.riskLevel === 'Low') low += inv.faceValue;
    else if (inv.riskLevel === 'Medium') medium += inv.faceValue;
    else high += inv.faceValue;
  }

  if (total <= 0) {
    return { low: 33, medium: 34, high: 33 };
  }

  let lowPct = Math.round((low / total) * 100);
  let medPct = Math.round((medium / total) * 100);
  let highPct = Math.round((high / total) * 100);
  const sum = lowPct + medPct + highPct;
  if (sum !== 100) {
    lowPct += 100 - sum;
  }

  return { low: lowPct, medium: medPct, high: highPct };
}
