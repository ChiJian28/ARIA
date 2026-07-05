import type { VaultInstrument } from './instruments';

/** Default pool APY when no funded instruments (decimal: 0.09 = 9%). */
export const DEFAULT_POOL_APY = 0.09;

/**
 * Collateral-weighted pool APY from active funded instruments.
 * `assetApy` is in percent (e.g. 9.0); return value is decimal (e.g. 0.09).
 */
export function computeWeightedPoolApy(
  instruments: Pick<VaultInstrument, 'assetApy' | 'collateralLockedMotes' | 'claimsStatus'>[],
  fallbackApy = DEFAULT_POOL_APY,
): number {
  const funded = instruments.filter(
    (inv) =>
      inv.collateralLockedMotes &&
      BigInt(inv.collateralLockedMotes) > 0n &&
      inv.claimsStatus === 'Active',
  );

  if (funded.length === 0) {
    const activeUnfunded = instruments.filter((inv) => inv.claimsStatus === 'Active');
    if (activeUnfunded.length > 0) {
      const avgPct =
        activeUnfunded.reduce((sum, inv) => sum + inv.assetApy, 0) / activeUnfunded.length;
      return Math.round((avgPct / 100) * 10000) / 10000;
    }
    return fallbackApy;
  }

  let weightedDecimal = 0;
  let totalWeight = 0;

  for (const inv of funded) {
    const weight = Number(inv.collateralLockedMotes);
    if (weight <= 0) continue;
    weightedDecimal += (inv.assetApy / 100) * weight;
    totalWeight += weight;
  }

  if (totalWeight <= 0) return fallbackApy;
  return Math.round((weightedDecimal / totalWeight) * 10000) / 10000;
}
