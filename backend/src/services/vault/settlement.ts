import { agentRepo } from '../../db/repositories/agent.repo';
import { rwaRepo } from '../../db/repositories/rwa.repo';
import { vaultRepo } from '../../db/repositories/vault.repo';
import { registerInstrument, processRepayment } from '../../blockchain/contracts/settlement-engine';
import { receiveYield, releaseCollateral } from '../../blockchain/contracts/liquidity-vault';
import { scoreAgentReputationsForRwa } from '../agents/reputation';
import { sseEmitter } from '../../api/sse/emitter';
import logger from '../../utils/logger';
import type { RwaSubmission } from '../../utils/types/rwa.types';

/** Matches SettlementEngine init default (50 bps = 0.5%). */
export const DEFAULT_PROTOCOL_FEE_BPS = 50;

export function resolveSuggestedRate(rawData?: Record<string, unknown> | null): number {
  const suggested = rawData?.suggestedRate;
  if (typeof suggested === 'number' && suggested > 0) return suggested;
  return 0.06;
}

export function resolvePrincipalMotes(submission: RwaSubmission): bigint {
  if (submission.collateralLockedMotes) {
    return BigInt(submission.collateralLockedMotes);
  }
  return BigInt(Math.floor(submission.faceValue * 1_000_000_000));
}

export function computeRepaymentMotes(principalMotes: bigint, annualRate: number): bigint {
  if (principalMotes <= 0n || annualRate <= 0) return principalMotes;
  const interest = (principalMotes * BigInt(Math.floor(annualRate * 10_000))) / 10_000n;
  return principalMotes + interest;
}

export function computeNetYieldMotes(
  principalMotes: bigint,
  repaymentMotes: bigint,
  feeBps = DEFAULT_PROTOCOL_FEE_BPS,
): bigint {
  if (repaymentMotes <= principalMotes) return 0n;
  const yieldPortion = repaymentMotes - principalMotes;
  const protocolFee = (yieldPortion * BigInt(feeBps)) / 10_000n;
  return yieldPortion > protocolFee ? yieldPortion - protocolFee : 0n;
}

export async function distributeYieldToLps(netYieldMotes: bigint): Promise<void> {
  if (netYieldMotes <= 0n) return;

  const positions = await vaultRepo.listAllPositions();
  const totalLp = positions.reduce((sum, pos) => sum + BigInt(pos.lpTokens || '0'), 0n);
  if (totalLp <= 0n) return;

  for (const pos of positions) {
    const lp = BigInt(pos.lpTokens || '0');
    if (lp <= 0n) continue;
    const share = (netYieldMotes * lp) / totalLp;
    if (share > 0n) {
      await vaultRepo.addYield(pos.address, share.toString());
    }
  }
}

export interface SettleRwaResult {
  rwaId: string;
  principalMotes: string;
  repaymentMotes: string;
  netYieldMotes: string;
  repaymentTxHash: string;
  yieldTxHash?: string;
  releaseTxHash?: string;
}

export async function ensureInstrumentRegistered(
  submission: RwaSubmission,
  principalMotes: bigint,
  annualRate: number,
  signerKeyPath?: string,
): Promise<void> {
  const dueDate =
    submission.dueDate instanceof Date
      ? submission.dueDate
      : new Date(submission.dueDate);
  const maturityTimestamp = Math.floor(dueDate.getTime() / 1000);
  const financingRateBps = Math.min(2000, Math.max(1, Math.round(annualRate * 10_000)));

  await registerInstrument(
    submission.id,
    principalMotes.toString(),
    financingRateBps,
    maturityTimestamp,
    signerKeyPath,
  );
}

export async function settleMaturedRwa(
  submission: RwaSubmission,
  signerKeyPath?: string,
): Promise<SettleRwaResult> {
  const votes = await agentRepo.getVotesByRwa(submission.id);
  const riskVote = votes.find((v) => v.agentId === 'risk');
  const annualRate = resolveSuggestedRate(riskVote?.rawData ?? null);

  const principalMotes = resolvePrincipalMotes(submission);
  if (principalMotes <= 0n) {
    throw new Error('Cannot settle RWA without locked principal');
  }

  const repaymentMotes = computeRepaymentMotes(principalMotes, annualRate);
  const netYieldMotes = computeNetYieldMotes(principalMotes, repaymentMotes);

  try {
    await ensureInstrumentRegistered(submission, principalMotes, annualRate, signerKeyPath);
  } catch (regErr) {
    const msg = (regErr as Error).message;
    if (!/User error: 3|RwaAlreadyRegistered|already registered/i.test(msg)) {
      throw regErr;
    }
    logger.info('Instrument already registered on-chain', { rwa_id: submission.id });
  }

  const repaymentResult = await processRepayment(
    submission.id,
    repaymentMotes.toString(),
    signerKeyPath,
  );

  let yieldTxHash: string | undefined;
  if (netYieldMotes > 0n) {
    const yieldResult = await receiveYield(
      submission.id,
      netYieldMotes.toString(),
      signerKeyPath,
    );
    yieldTxHash = yieldResult.deployHash;
    await distributeYieldToLps(netYieldMotes);
  }

  let releaseTxHash: string | undefined;
  if (submission.collateralLockedMotes) {
    const releaseResult = await releaseCollateral(submission.id, signerKeyPath);
    releaseTxHash = releaseResult.deployHash;
    await rwaRepo.clearCollateralLock(submission.id);
  }

  await rwaRepo.updateStatus(submission.id, 'SETTLED');
  await vaultRepo.recordSettlementEvent({
    rwaId: submission.id,
    eventType: 'MATURITY',
    amount: repaymentMotes.toString(),
    txHash: repaymentResult.deployHash,
  });

  if (netYieldMotes > 0n) {
    await vaultRepo.recordSettlementEvent({
      rwaId: submission.id,
      eventType: 'YIELD_DISTRIBUTION',
      amount: netYieldMotes.toString(),
      txHash: yieldTxHash,
    });
  }

  await scoreAgentReputationsForRwa(submission.id, 'success');

  sseEmitter.emit('VAULT_EVENT', {
    type: 'VAULT_EVENT',
    rwaId: submission.id,
    data: {
      eventType: 'YIELD_DISTRIBUTED',
      principalMotes: principalMotes.toString(),
      repaymentMotes: repaymentMotes.toString(),
      netYieldMotes: netYieldMotes.toString(),
      repaymentTxHash: repaymentResult.deployHash,
      yieldTxHash,
      releaseTxHash,
    },
    timestamp: new Date().toISOString(),
  });

  logger.info('RWA settled with on-chain yield', {
    rwa_id: submission.id,
    principalMotes: principalMotes.toString(),
    netYieldMotes: netYieldMotes.toString(),
  });

  return {
    rwaId: submission.id,
    principalMotes: principalMotes.toString(),
    repaymentMotes: repaymentMotes.toString(),
    netYieldMotes: netYieldMotes.toString(),
    repaymentTxHash: repaymentResult.deployHash,
    yieldTxHash,
    releaseTxHash,
  };
}
