import { buildMintRwaDeploy, buildUpdateReputationDeploy } from '../transactions/builder';
import { signDeploy } from '../transactions/signer';
import { submitAndWait, submitMockDeploy } from '../transactions/submitter';
import { publicKeyFromHex, publicKeyFromKeyFile } from '../transactions/casper-keys';
import { getCasperConfig } from '../../config/casper';
import { config } from '../../config';
import logger from '../../utils/logger';
import { DeployResult } from '../../utils/types/blockchain.types';

export interface RwaMetadata {
  rwaId: string;
  assetType: string;
  faceValue: string;
  currency: string;
  issuerName: string;
  issuerCountry: string;
  buyerName: string;
  buyerCountry: string;
  issueDate: string;
  dueDate: string;
  riskScore: string;
  collateralRatio: string;
  approvedAt: string;
}

/** Contract minter is the deployer account set at RwaRegistry init. */
function getMinterKeyPath(signerKeyPath?: string): string {
  return config.DEPLOYER_SECRET_KEY_PATH || signerKeyPath || './keys/deployer/secret_key.pem';
}

export async function mintRwaNft(
  rwaId: string,
  ownerPublicKeyHex: string,
  metadata: RwaMetadata,
  signerKeyPath?: string,
): Promise<DeployResult> {
  const casperConfig = getCasperConfig();

  if (!casperConfig.contracts.rwaRegistry.packageHash) {
    logger.warn('RWA Registry contract not deployed yet, using mock mint', { rwa_id: rwaId });
    return submitMockDeploy(`mint-rwa-${rwaId}`);
  }

  const minterKeyPath = getMinterKeyPath(signerKeyPath);

  try {
    const callerKey = publicKeyFromKeyFile(minterKeyPath);
    // Validate owner key format early (wallet sends tagged hex)
    publicKeyFromHex(ownerPublicKeyHex);

    const metadataRecord: Record<string, string> = {
      rwa_id: metadata.rwaId,
      asset_type: metadata.assetType,
      face_value: metadata.faceValue,
      currency: metadata.currency,
      issuer_name: metadata.issuerName,
      issuer_country: metadata.issuerCountry,
      buyer_name: metadata.buyerName,
      buyer_country: metadata.buyerCountry,
      issue_date: metadata.issueDate,
      due_date: metadata.dueDate,
      risk_score: metadata.riskScore,
      collateral_ratio: metadata.collateralRatio,
      approved_at: metadata.approvedAt,
    };

    const deploy = buildMintRwaDeploy(rwaId, ownerPublicKeyHex, metadataRecord, callerKey);
    const signedDeploy = signDeploy(deploy, minterKeyPath);
    return await submitAndWait(signedDeploy);
  } catch (err) {
    logger.error('Failed to mint RWA NFT', { rwa_id: rwaId, error: (err as Error).message });
    throw err;
  }
}

export async function burnRwaNft(
  tokenId: string,
  signerKeyPath: string,
): Promise<DeployResult> {
  // TODO: Implement burn_rwa contract call
  logger.info('burnRwaNft called (mock)', { tokenId });
  return submitMockDeploy(`burn-rwa-${tokenId}`);
}

export async function updateAgentReputationOnChain(
  agentPublicKeyHex: string,
  correct: boolean,
  signerKeyPath?: string,
): Promise<DeployResult> {
  const casperConfig = getCasperConfig();

  if (!casperConfig.contracts.rwaRegistry.packageHash) {
    logger.warn('RWA Registry contract not deployed, using mock reputation update', {
      agentPublicKeyHex: agentPublicKeyHex.substring(0, 16),
      correct,
    });
    return submitMockDeploy(`update-reputation-${correct}`);
  }

  const ownerKeyPath = signerKeyPath ?? config.DEPLOYER_SECRET_KEY_PATH;

  try {
    const callerKey = publicKeyFromKeyFile(ownerKeyPath);
    publicKeyFromHex(agentPublicKeyHex);

    const deploy = buildUpdateReputationDeploy(agentPublicKeyHex, correct, callerKey);
    const signedDeploy = signDeploy(deploy, ownerKeyPath);
    return await submitAndWait(signedDeploy);
  } catch (err) {
    logger.error('Failed to update agent reputation on-chain', {
      error: (err as Error).message,
      correct,
    });
    throw err;
  }
}
