import {
  DeployUtil,
  CLPublicKey,
  CLValueBuilder,
  RuntimeArgs,
  decodeBase16,
} from 'casper-js-sdk';
import { getCasperConfig } from '../../config/casper';
import logger from '../../utils/logger';
import { buildProxyCallerSession, stripHashPrefix } from './proxy-caller';
import { accountHashKeyFromPublicKeyHex } from './casper-keys';

export interface DeployArgs {
  contractHash: string;
  entryPoint: string;
  args: RuntimeArgs;
  paymentMotes: string;
  caller: CLPublicKey;
}

export function buildContractCallDeploy(params: DeployArgs): DeployUtil.Deploy {
  const casperConfig = getCasperConfig();
  const payment = DeployUtil.standardPayment(params.paymentMotes);
  const hashHex = stripHashPrefix(params.contractHash);

  const session = DeployUtil.ExecutableDeployItem.newStoredContractByHash(
    Uint8Array.from(Buffer.from(hashHex, 'hex')),
    params.entryPoint,
    params.args,
  );

  const deployParams = new DeployUtil.DeployParams(
    params.caller,
    casperConfig.networkName,
    1,
    1_800_000,
  );

  const deploy = DeployUtil.makeDeploy(deployParams, session, payment);

  logger.debug('Deploy built', {
    entryPoint: params.entryPoint,
    contractHash: params.contractHash,
    paymentMotes: params.paymentMotes,
  });

  return deploy;
}

function buildVersionedPackageDeploy(
  packageHash: string,
  entryPoint: string,
  args: RuntimeArgs,
  paymentMotes: string,
  caller: CLPublicKey,
): DeployUtil.Deploy {
  const casperConfig = getCasperConfig();
  const payment = DeployUtil.standardPayment(paymentMotes);
  const hashHex = stripHashPrefix(packageHash);

  const session = DeployUtil.ExecutableDeployItem.newStoredVersionContractByHash(
    Uint8Array.from(decodeBase16(hashHex)),
    null,
    entryPoint,
    args,
  );

  const deployParams = new DeployUtil.DeployParams(
    caller,
    casperConfig.networkName,
    1,
    1_800_000,
  );

  return DeployUtil.makeDeploy(deployParams, session, payment);
}

export function buildMintRwaDeploy(
  rwaId: string,
  ownerPublicKeyHex: string,
  metadata: Record<string, string>,
  caller: CLPublicKey,
): DeployUtil.Deploy {
  const { packageHash } = getCasperConfig().contracts.rwaRegistry;
  if (!packageHash) {
    throw new Error('RWA_REGISTRY_PACKAGE_HASH is not configured');
  }

  const args = RuntimeArgs.fromMap({
    rwa_id: CLValueBuilder.string(rwaId),
    owner_address: accountHashKeyFromPublicKeyHex(ownerPublicKeyHex),
    metadata_json: CLValueBuilder.string(JSON.stringify(metadata)),
  });

  return buildVersionedPackageDeploy(
    packageHash,
    'mint_rwa',
    args,
    getCasperConfig().gasCosts.mint,
    caller,
  );
}

export function buildUpdateReputationDeploy(
  agentPublicKeyHex: string,
  correct: boolean,
  caller: CLPublicKey,
): DeployUtil.Deploy {
  const { packageHash } = getCasperConfig().contracts.rwaRegistry;
  if (!packageHash) {
    throw new Error('RWA_REGISTRY_PACKAGE_HASH is not configured');
  }

  const args = RuntimeArgs.fromMap({
    agent: accountHashKeyFromPublicKeyHex(agentPublicKeyHex),
    correct: CLValueBuilder.bool(correct),
  });

  return buildVersionedPackageDeploy(
    packageHash,
    'update_reputation',
    args,
    getCasperConfig().gasCosts.vote,
    caller,
  );
}

export function buildCastVoteDeploy(
  rwaId: string,
  vote: 'approve' | 'reject',
  confidence: number,
  caller: CLPublicKey,
): DeployUtil.Deploy {
  const { packageHash } = getCasperConfig().contracts.agentCouncil;
  if (!packageHash) {
    throw new Error('AGENT_COUNCIL_PACKAGE_HASH is not configured');
  }

  const args = RuntimeArgs.fromMap({
    rwa_id: CLValueBuilder.string(rwaId),
    approve: CLValueBuilder.bool(vote === 'approve'),
    confidence: CLValueBuilder.u8(Math.min(100, Math.floor(confidence * 100))),
  });

  return buildVersionedPackageDeploy(
    packageHash,
    'cast_vote',
    args,
    getCasperConfig().gasCosts.vote,
    caller,
  );
}

export function buildRegisterAgentDeploy(
  agentPublicKeyHex: string,
  caller: CLPublicKey,
): DeployUtil.Deploy {
  const { packageHash } = getCasperConfig().contracts.agentCouncil;
  if (!packageHash) {
    throw new Error('AGENT_COUNCIL_PACKAGE_HASH is not configured');
  }

  const args = RuntimeArgs.fromMap({
    agent: accountHashKeyFromPublicKeyHex(agentPublicKeyHex),
  });

  return buildVersionedPackageDeploy(
    packageHash,
    'register_agent',
    args,
    getCasperConfig().gasCosts.vote,
    caller,
  );
}

export function buildFinalizeVoteDeploy(
  rwaId: string,
  caller: CLPublicKey,
): DeployUtil.Deploy {
  const { packageHash } = getCasperConfig().contracts.agentCouncil;
  if (!packageHash) {
    throw new Error('AGENT_COUNCIL_PACKAGE_HASH is not configured');
  }

  const args = RuntimeArgs.fromMap({
    rwa_id: CLValueBuilder.string(rwaId),
  });

  return buildVersionedPackageDeploy(
    packageHash,
    'finalize_vote',
    args,
    getCasperConfig().gasCosts.vote,
    caller,
  );
}

/** Payable deposit — must go through Odra proxy caller with attached CSPR. */
export function buildDepositDeploy(
  amountMotes: string,
  caller: CLPublicKey,
): DeployUtil.Deploy {
  const { packageHash } = getCasperConfig().contracts.liquidityVault;
  if (!packageHash) {
    throw new Error('LIQUIDITY_VAULT_PACKAGE_HASH is not configured');
  }

  const casperConfig = getCasperConfig();
  const payment = DeployUtil.standardPayment(casperConfig.gasCosts.deposit);
  const session = buildProxyCallerSession(
    packageHash,
    'deposit',
    RuntimeArgs.fromMap({}),
    amountMotes,
  );

  const deployParams = new DeployUtil.DeployParams(
    caller,
    casperConfig.networkName,
    1,
    1_800_000,
  );

  const deploy = DeployUtil.makeDeploy(deployParams, session, payment);

  logger.debug('Deposit deploy built via proxy caller', {
    amountMotes,
    packageHash,
  });

  return deploy;
}

/** Burn LP tokens and receive proportional CSPR (direct versioned contract call). */
export function buildWithdrawDeploy(
  lpAmountMotes: string,
  caller: CLPublicKey,
): DeployUtil.Deploy {
  const { packageHash } = getCasperConfig().contracts.liquidityVault;
  if (!packageHash) {
    throw new Error('LIQUIDITY_VAULT_PACKAGE_HASH is not configured');
  }

  const args = RuntimeArgs.fromMap({
    lp_amount: CLValueBuilder.u512(lpAmountMotes),
  });

  return buildVersionedPackageDeploy(
    packageHash,
    'withdraw',
    args,
    getCasperConfig().gasCosts.withdraw,
    caller,
  );
}

export function buildLiquidateDeploy(
  rwaId: string,
  caller: CLPublicKey,
): DeployUtil.Deploy {
  const contractHash = getCasperConfig().contracts.settlementEngine.contractHash ?? '';

  const args = RuntimeArgs.fromMap({
    rwa_id: CLValueBuilder.string(rwaId),
  });

  return buildContractCallDeploy({
    contractHash,
    entryPoint: 'trigger_liquidation',
    args,
    paymentMotes: getCasperConfig().gasCosts.liquidate,
    caller,
  });
}
