import { buildCastVoteDeploy, buildRegisterAgentDeploy, buildFinalizeVoteDeploy } from '../transactions/builder';
import { signDeploy } from '../transactions/signer';
import { submitAndWait, submitMockDeploy } from '../transactions/submitter';
import { publicKeyFromHex, publicKeyFromKeyFile } from '../transactions/casper-keys';
import { getCasperConfig } from '../../config/casper';
import { config } from '../../config';
import logger from '../../utils/logger';
import { DeployResult } from '../../utils/types/blockchain.types';

export async function castVoteOnChain(
  rwaId: string,
  vote: 'approve' | 'reject',
  confidence: number,
  agentPublicKeyHex: string,
  signerKeyPath: string,
): Promise<DeployResult> {
  const casperConfig = getCasperConfig();

  if (!casperConfig.contracts.agentCouncil.packageHash) {
    logger.warn('AgentCouncil contract not deployed, using mock vote', {
      rwa_id: rwaId,
      vote,
    });
    return submitMockDeploy(`vote-${vote}-${rwaId}`);
  }

  try {
    const callerKey = publicKeyFromHex(agentPublicKeyHex);
    const deploy = buildCastVoteDeploy(rwaId, vote, confidence, callerKey);
    const signedDeploy = signDeploy(deploy, signerKeyPath);
    return await submitAndWait(signedDeploy);
  } catch (err) {
    logger.error('Failed to cast vote on-chain', { rwa_id: rwaId, error: (err as Error).message });
    throw err;
  }
}

export async function finalizeVote(rwaId: string, signerKeyPath?: string): Promise<DeployResult> {
  const casperConfig = getCasperConfig();

  if (!casperConfig.contracts.agentCouncil.packageHash) {
    logger.info('finalizeVote called (mock)', { rwa_id: rwaId });
    return submitMockDeploy(`finalize-${rwaId}`);
  }

  const ownerKeyPath = signerKeyPath ?? config.DEPLOYER_SECRET_KEY_PATH;

  try {
    const callerKey = publicKeyFromKeyFile(ownerKeyPath);
    const deploy = buildFinalizeVoteDeploy(rwaId, callerKey);
    const signedDeploy = signDeploy(deploy, ownerKeyPath);
    return await submitAndWait(signedDeploy);
  } catch (err) {
    logger.error('Failed to finalize vote on-chain', { rwa_id: rwaId, error: (err as Error).message });
    throw err;
  }
}

export async function registerAgent(
  agentPublicKeyHex: string,
  agentId: string,
  _weight: number,
  signerKeyPath?: string,
): Promise<DeployResult> {
  const casperConfig = getCasperConfig();

  if (!casperConfig.contracts.agentCouncil.packageHash) {
    logger.warn('AgentCouncil contract not deployed, using mock register', { agentId });
    return submitMockDeploy(`register-agent-${agentId}`);
  }

  const ownerKeyPath = signerKeyPath ?? config.DEPLOYER_SECRET_KEY_PATH;

  try {
    const callerKey = publicKeyFromKeyFile(ownerKeyPath);
    const deploy = buildRegisterAgentDeploy(agentPublicKeyHex, callerKey);
    const signedDeploy = signDeploy(deploy, ownerKeyPath);
    logger.info('Registering agent on-chain', { agentId });
    return await submitAndWait(signedDeploy);
  } catch (err) {
    logger.error('Failed to register agent on-chain', { agentId, error: (err as Error).message });
    throw err;
  }
}
