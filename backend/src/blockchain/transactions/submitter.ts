import { DeployUtil } from 'casper-js-sdk';
import { getCasperClient, getRpcService } from '../client';
import { getDeployStatus } from '../../services/cspr-cloud/node-api';
import logger from '../../utils/logger';
import { DeployResult } from '../../utils/types/blockchain.types';

const POLL_INTERVAL_MS = 5000;
const MAX_POLLS = 24; // 120 seconds max wait

export async function submitDeploy(deploy: DeployUtil.Deploy): Promise<string> {
  const client = getCasperClient();

  try {
    const deployHash = await client.putDeploy(deploy);
    logger.info('Deploy submitted', { deployHash });
    return deployHash;
  } catch (err) {
    logger.error('Failed to submit deploy', { error: (err as Error).message });
    throw err;
  }
}

export async function submitAndWait(deploy: DeployUtil.Deploy): Promise<DeployResult> {
  const deployHash = await submitDeploy(deploy);

  logger.info('Waiting for deploy finality', { deployHash });

  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    const status = await getDeployStatus(deployHash);

    if (status === 'success') {
      logger.info('Deploy finalized successfully', { deployHash });
      return { deployHash, status: 'success' };
    }

    if (status === 'failure') {
      logger.error('Deploy failed on-chain', { deployHash });
      return { deployHash, status: 'failure', errorMessage: 'Deploy execution failed' };
    }

    logger.debug('Deploy still pending', { deployHash, poll: i + 1 });
  }

  // Timeout — treat as pending (not failure)
  logger.warn('Deploy finality timeout', { deployHash });
  return { deployHash, status: 'pending', errorMessage: 'Finality timeout' };
}

export async function submitMockDeploy(label: string): Promise<DeployResult> {
  // TODO: Remove this when all contracts are deployed on testnet
  // This is used during development when contract hashes are not yet available
  const mockHash = `mock-${label}-${Date.now().toString(16)}`;
  logger.info(`[MOCK] Deploy submitted: ${label}`, { deployHash: mockHash });
  await new Promise((r) => setTimeout(r, 2000)); // simulate block time
  return { deployHash: mockHash, status: 'success' };
}
