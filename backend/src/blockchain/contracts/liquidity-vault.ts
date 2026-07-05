import {
  buildDepositDeploy,
  buildWithdrawDeploy,
  buildLockCollateralDeploy,
  buildReleaseCollateralDeploy,
  buildReceiveYieldDeploy,
} from '../transactions/builder';
import { signDeploy } from '../transactions/signer';
import { submitDeploy, submitAndWait, submitMockDeploy, assertDeploySuccess } from '../transactions/submitter';
import { publicKeyFromHex, publicKeyFromKeyFile } from '../transactions/casper-keys';
import { getCasperConfig } from '../../config/casper';
import { config } from '../../config';
import logger from '../../utils/logger';
import { DeployResult } from '../../utils/types/blockchain.types';
import { DeployUtil, CLPublicKey } from 'casper-js-sdk';

function isVaultConfigured(): boolean {
  const cfg = getCasperConfig().contracts.liquidityVault;
  return Boolean(cfg.contractHash && cfg.packageHash);
}

function getVaultOwnerKeyPath(signerKeyPath?: string): string {
  return config.DEPLOYER_SECRET_KEY_PATH || signerKeyPath || './keys/deployer/secret_key.pem';
}

function callerFromHex(publicKeyHex: string): CLPublicKey {
  return publicKeyFromHex(publicKeyHex);
}

export function buildUnsignedDepositDeploy(
  amountMotes: string,
  depositorPublicKeyHex: string,
): Record<string, unknown> {
  if (!isVaultConfigured()) {
    throw new Error('Liquidity vault contract is not deployed on testnet');
  }
  const deploy = buildDepositDeploy(amountMotes, callerFromHex(depositorPublicKeyHex));
  return DeployUtil.deployToJson(deploy) as Record<string, unknown>;
}

export function buildUnsignedWithdrawDeploy(
  lpTokenAmountMotes: string,
  withdrawerPublicKeyHex: string,
): Record<string, unknown> {
  if (!isVaultConfigured()) {
    throw new Error('Liquidity vault contract is not deployed on testnet');
  }
  const deploy = buildWithdrawDeploy(lpTokenAmountMotes, callerFromHex(withdrawerPublicKeyHex));
  return DeployUtil.deployToJson(deploy) as Record<string, unknown>;
}

/**
 * Parse and validate a signed deploy JSON.
 * Returns the Deploy object (does NOT submit to network).
 */
export function parseSignedVaultDeploy(signedDeployJson: unknown): DeployUtil.Deploy {
  const parsed = DeployUtil.deployFromJson(signedDeployJson);
  if (parsed.err) {
    logger.error('[vault] deployFromJson failed to parse signed deploy', {
      error: String(parsed.val),
      jsonPreview: JSON.stringify(signedDeployJson)?.slice(0, 500),
    });
    throw parsed.val;
  }
  return parsed.val;
}

/**
 * Submit a parsed signed deploy to the network immediately.
 * Returns the deploy hash without waiting for finality.
 */
export async function submitSignedVaultDeploy(signedDeployJson: unknown): Promise<string> {
  logger.debug('[vault] Parsing signed deploy JSON…');
  const deploy = parseSignedVaultDeploy(signedDeployJson);
  const deployJson = DeployUtil.deployToJson(deploy) as Record<string, unknown>;
  const deployHash = (deployJson.deploy as Record<string, unknown>)?.hash as string;
  const approvals = (deployJson.deploy as Record<string, unknown>)?.approvals;
  logger.info('[vault] Signed deploy parsed OK', {
    deployHash,
    sigCount: Array.isArray(approvals) ? approvals.length : 0,
  });
  logger.debug('[vault] Calling putDeploy on testnet node…', { deployHash });
  const t0 = Date.now();
  const hash = await submitDeploy(deploy);
  logger.info('[vault] putDeploy returned', { deployHash: hash, elapsedMs: Date.now() - t0 });
  return hash;
}

/** Proportional LP estimate — matches on-chain calc_lp_for_deposit. */
export function estimateLpForDeposit(
  amountMotes: bigint,
  totalCsprMotes: bigint,
  totalLpMotes: bigint,
): bigint {
  if (totalLpMotes === 0n || totalCsprMotes === 0n) return amountMotes;
  return (amountMotes * totalLpMotes) / totalCsprMotes;
}

/** Proportional CSPR estimate — matches on-chain calc_cspr_for_lp. */
export function estimateCsprForWithdraw(
  lpAmountMotes: bigint,
  totalCsprMotes: bigint,
  totalLpMotes: bigint,
): bigint {
  if (totalLpMotes === 0n) return 0n;
  return (lpAmountMotes * totalCsprMotes) / totalLpMotes;
}

export async function depositToVault(
  amountMotes: string,
  depositorPublicKeyHex: string,
  signerKeyPath: string,
): Promise<DeployResult> {
  if (!isVaultConfigured()) {
    logger.warn('LiquidityVault contract not deployed, using mock deposit', { amountMotes });
    return submitMockDeploy(`deposit-${amountMotes}`);
  }

  try {
    const deploy = buildDepositDeploy(amountMotes, callerFromHex(depositorPublicKeyHex));
    const signedDeploy = signDeploy(deploy, signerKeyPath);
    return assertDeploySuccess(await submitAndWait(signedDeploy), 'deposit');
  } catch (err) {
    logger.error('Failed to deposit to vault', { error: (err as Error).message });
    throw err;
  }
}

export async function withdrawFromVault(
  lpTokenAmount: string,
  withdrawerPublicKeyHex: string,
  signerKeyPath: string,
): Promise<DeployResult> {
  if (!isVaultConfigured()) {
    logger.info('withdrawFromVault called (mock)', { lpTokenAmount });
    return submitMockDeploy(`withdraw-${lpTokenAmount}`);
  }

  try {
    const deploy = buildWithdrawDeploy(lpTokenAmount, callerFromHex(withdrawerPublicKeyHex));
    const signedDeploy = signDeploy(deploy, signerKeyPath);
    return assertDeploySuccess(await submitAndWait(signedDeploy), 'withdraw');
  } catch (err) {
    logger.error('Failed to withdraw from vault', { error: (err as Error).message });
    throw err;
  }
}

export async function lockCollateral(
  rwaId: string,
  amountMotes: string,
  signerKeyPath?: string,
): Promise<DeployResult> {
  if (!isVaultConfigured()) {
    logger.warn('LiquidityVault not deployed, using mock lock_collateral', { rwa_id: rwaId, amountMotes });
    return submitMockDeploy(`lock-collateral-${rwaId}`);
  }

  const ownerKeyPath = getVaultOwnerKeyPath(signerKeyPath);

  try {
    const callerKey = publicKeyFromKeyFile(ownerKeyPath);
    const deploy = buildLockCollateralDeploy(rwaId, amountMotes, callerKey);
    const signedDeploy = signDeploy(deploy, ownerKeyPath);
    const result = assertDeploySuccess(
      await submitAndWait(signedDeploy),
      'lock_collateral',
    );
    logger.info('Collateral locked on-chain', {
      rwa_id: rwaId,
      amountMotes,
      deployHash: result.deployHash,
    });
    return result;
  } catch (err) {
    logger.error('Failed to lock collateral', { rwa_id: rwaId, error: (err as Error).message });
    throw err;
  }
}

export async function releaseCollateral(
  rwaId: string,
  signerKeyPath?: string,
): Promise<DeployResult> {
  if (!isVaultConfigured()) {
    logger.warn('LiquidityVault not deployed, using mock release_collateral', { rwa_id: rwaId });
    return submitMockDeploy(`release-collateral-${rwaId}`);
  }

  const ownerKeyPath = getVaultOwnerKeyPath(signerKeyPath);

  try {
    const callerKey = publicKeyFromKeyFile(ownerKeyPath);
    const deploy = buildReleaseCollateralDeploy(rwaId, callerKey);
    const signedDeploy = signDeploy(deploy, ownerKeyPath);
    const result = assertDeploySuccess(
      await submitAndWait(signedDeploy),
      'release_collateral',
    );
    logger.info('Collateral released on-chain', {
      rwa_id: rwaId,
      deployHash: result.deployHash,
    });
    return result;
  } catch (err) {
    logger.error('Failed to release collateral', { rwa_id: rwaId, error: (err as Error).message });
    throw err;
  }
}

export async function receiveYield(
  rwaId: string,
  yieldMotes: string,
  signerKeyPath?: string,
): Promise<DeployResult> {
  if (!isVaultConfigured()) {
    logger.warn('LiquidityVault not deployed, using mock receive_yield', { rwa_id: rwaId });
    return submitMockDeploy(`receive-yield-${rwaId}`);
  }

  const ownerKeyPath = getVaultOwnerKeyPath(signerKeyPath);

  try {
    const callerKey = publicKeyFromKeyFile(ownerKeyPath);
    const deploy = buildReceiveYieldDeploy(rwaId, yieldMotes, callerKey);
    const signedDeploy = signDeploy(deploy, ownerKeyPath);
    const result = assertDeploySuccess(
      await submitAndWait(signedDeploy),
      'receive_yield',
    );
    logger.info('Yield received on-chain', {
      rwa_id: rwaId,
      yieldMotes,
      deployHash: result.deployHash,
    });
    return result;
  } catch (err) {
    logger.error('Failed to receive yield', { rwa_id: rwaId, error: (err as Error).message });
    throw err;
  }
}
