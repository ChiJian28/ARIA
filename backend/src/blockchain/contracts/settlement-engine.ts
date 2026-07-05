import {
  buildRegisterInstrumentDeploy,
  buildProcessRepaymentDeploy,
} from '../transactions/builder';
import { signDeploy } from '../transactions/signer';
import { submitAndWait, submitMockDeploy, assertDeploySuccess } from '../transactions/submitter';
import { publicKeyFromKeyFile } from '../transactions/casper-keys';
import { getCasperConfig } from '../../config/casper';
import { config } from '../../config';
import logger from '../../utils/logger';
import { DeployResult } from '../../utils/types/blockchain.types';

function isSettlementConfigured(): boolean {
  const cfg = getCasperConfig().contracts.settlementEngine;
  return Boolean(cfg.contractHash && cfg.packageHash);
}

function getOwnerKeyPath(signerKeyPath?: string): string {
  return config.DEPLOYER_SECRET_KEY_PATH || signerKeyPath || './keys/deployer/secret_key.pem';
}

export async function registerInstrument(
  rwaId: string,
  faceValueMotes: string,
  financingRateBps: number,
  maturityTimestamp: number,
  signerKeyPath?: string,
): Promise<DeployResult> {
  if (!isSettlementConfigured()) {
    logger.warn('SettlementEngine not deployed, using mock register_instrument', { rwa_id: rwaId });
    return submitMockDeploy(`register-instrument-${rwaId}`);
  }

  const ownerKeyPath = getOwnerKeyPath(signerKeyPath);

  try {
    const callerKey = publicKeyFromKeyFile(ownerKeyPath);
    const deploy = buildRegisterInstrumentDeploy(
      rwaId,
      faceValueMotes,
      financingRateBps,
      maturityTimestamp,
      callerKey,
    );
    const signedDeploy = signDeploy(deploy, ownerKeyPath);
    const result = assertDeploySuccess(
      await submitAndWait(signedDeploy),
      'register_instrument',
    );
    logger.info('Instrument registered on-chain', {
      rwa_id: rwaId,
      faceValueMotes,
      financingRateBps,
      deployHash: result.deployHash,
    });
    return result;
  } catch (err) {
    logger.error('Failed to register instrument', { rwa_id: rwaId, error: (err as Error).message });
    throw err;
  }
}

export async function processRepayment(
  rwaId: string,
  repaymentMotes: string,
  signerKeyPath?: string,
): Promise<DeployResult> {
  if (!isSettlementConfigured()) {
    logger.warn('SettlementEngine not deployed, using mock process_repayment', { rwa_id: rwaId });
    return submitMockDeploy(`repayment-${rwaId}`);
  }

  const ownerKeyPath = getOwnerKeyPath(signerKeyPath);

  try {
    const callerKey = publicKeyFromKeyFile(ownerKeyPath);
    const deploy = buildProcessRepaymentDeploy(rwaId, repaymentMotes, callerKey);
    const signedDeploy = signDeploy(deploy, ownerKeyPath);
    const result = assertDeploySuccess(
      await submitAndWait(signedDeploy),
      'process_repayment',
    );
    logger.info('Repayment processed on-chain', {
      rwa_id: rwaId,
      repaymentMotes,
      deployHash: result.deployHash,
    });
    return result;
  } catch (err) {
    logger.error('Failed to process repayment', { rwa_id: rwaId, error: (err as Error).message });
    throw err;
  }
}

export async function triggerLiquidation(
  rwaId: string,
  signerKeyPath?: string,
): Promise<DeployResult> {
  if (!isSettlementConfigured()) {
    logger.info('triggerLiquidation called (mock)', { rwa_id: rwaId });
    return submitMockDeploy(`liquidate-${rwaId}`);
  }

  // TODO: buildTriggerLiquidationDeploy when liquidation flow is needed
  logger.info('triggerLiquidation not yet wired to contract', { rwa_id: rwaId });
  return submitMockDeploy(`liquidate-${rwaId}`);
}
