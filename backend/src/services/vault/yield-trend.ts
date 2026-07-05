import { vaultRepo } from '../../db/repositories/vault.repo';

export interface YieldTrendPoint {
  date: string;
  dailyYieldMotes: string;
  cumulativeYieldMotes: string;
}

function utcDateKeys(days: number): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
    keys.push(d.toISOString().slice(0, 10));
  }
  return keys;
}

async function resolvePoolYieldByDay(since: Date): Promise<Map<string, bigint>> {
  const byDay = new Map<string, bigint>();

  const distributions = await vaultRepo.getYieldDistributionByDay(since);
  for (const row of distributions) {
    byDay.set(row.day, BigInt(row.amount || '0'));
  }

  if (byDay.size > 0) return byDay;

  const totalYield = BigInt((await vaultRepo.getYieldAccrued()) || '0');
  if (totalYield <= 0n) return byDay;

  const maturityDays = await vaultRepo.getMaturityEventDays(since);
  if (maturityDays.length === 0) return byDay;

  // Legacy settlements only recorded MATURITY — attribute pool yield to those days.
  const perDay = totalYield / BigInt(maturityDays.length);
  let remainder = totalYield - perDay * BigInt(maturityDays.length);
  for (const day of maturityDays) {
    const extra = remainder > 0n ? 1n : 0n;
    if (remainder > 0n) remainder -= 1n;
    byDay.set(day, (byDay.get(day) ?? 0n) + perDay + extra);
  }

  return byDay;
}

async function resolveUserLpShare(address?: string): Promise<bigint> {
  if (!address) return 1_000_000n;

  const [position, tvl] = await Promise.all([
    vaultRepo.getPosition(address),
    vaultRepo.getTVL(),
  ]);

  const userLp = BigInt(position?.lpTokens ?? '0');
  const totalLp = BigInt(tvl.totalCspr || '0');
  if (userLp <= 0n || totalLp <= 0n) return 0n;

  return (userLp * 1_000_000n) / totalLp;
}

export async function getUserYieldTrend(
  address: string | undefined,
  days = 7,
): Promise<YieldTrendPoint[]> {
  const windowDays = Math.min(30, Math.max(1, days));
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - (windowDays - 1));
  since.setUTCHours(0, 0, 0, 0);

  const poolByDay = await resolvePoolYieldByDay(since);
  const lpShare = await resolveUserLpShare(address);

  let cumulative = 0n;
  return utcDateKeys(windowDays).map((date) => {
    const poolDaily = poolByDay.get(date) ?? 0n;
    const daily = (poolDaily * lpShare) / 1_000_000n;
    cumulative += daily;
    return {
      date,
      dailyYieldMotes: daily.toString(),
      cumulativeYieldMotes: cumulative.toString(),
    };
  });
}
