/**
 * Resolve how much CSPR (motes) to lock against an approved RWA.
 * Uses pool TVL × collateral ratio, capped by available (unlocked) liquidity.
 */
export function resolveLockAmountMotes(
  totalCsprMotes: bigint,
  alreadyLockedMotes: bigint,
  collateralRatio?: number,
): bigint {
  if (totalCsprMotes <= 0n) return 0n;

  const ratio =
    collateralRatio !== undefined && collateralRatio > 0 && collateralRatio <= 1
      ? collateralRatio
      : 0.75;

  const available = totalCsprMotes > alreadyLockedMotes
    ? totalCsprMotes - alreadyLockedMotes
    : 0n;
  if (available <= 0n) return 0n;

  const basisPoints = BigInt(Math.floor(ratio * 10_000));
  const target = (totalCsprMotes * basisPoints) / 10_000n;

  return target > available ? available : target;
}
