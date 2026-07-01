/**
 * Transfer CSPR from deployer to each agent account (for on-chain vote gas).
 * Usage: cd backend && npx ts-node scripts/testnet/fund-agents-from-deployer.ts
 */
import 'dotenv/config';
import { DeployUtil, CLPublicKey } from 'casper-js-sdk';
import { getCasperClient } from '../../src/blockchain/client';
import { signDeploy } from '../../src/blockchain/transactions/signer';
import { publicKeyFromKeyFile, normalizePublicKeyHex } from '../../src/blockchain/transactions/casper-keys';
import { getAgentConfigs } from '../../src/config/agents';
import { config } from '../../src/config';
import { loadKeyPairFromFile } from '../../src/utils/crypto';
import path from 'path';

const TRANSFER_MOTES = '5000000000'; // 5 CSPR per agent

async function transferToAgent(
  deployerKeyPath: string,
  recipientPublicKeyHex: string,
  label: string,
): Promise<void> {
  const deployerPk = publicKeyFromKeyFile(deployerKeyPath);
  const recipientPk = CLPublicKey.fromHex(normalizePublicKeyHex(recipientPublicKeyHex));

  const session = DeployUtil.ExecutableDeployItem.newTransferWithOptionalTransferId(
    TRANSFER_MOTES,
    recipientPk,
    null,
  );
  const payment = DeployUtil.standardPayment('100000000');
  const deployParams = new DeployUtil.DeployParams(
    deployerPk,
    config.CASPER_NETWORK_NAME,
    1,
    1_800_000,
  );
  const deploy = DeployUtil.makeDeploy(deployParams, session, payment);

  const signed = signDeploy(deploy, deployerKeyPath);
  const hash = await getCasperClient().putDeploy(signed);
  console.log(`  ✓ Sent 5 CSPR to ${label}: ${hash}`);
}

async function main() {
  const deployerKeyPath = config.DEPLOYER_SECRET_KEY_PATH;
  console.log('Funding agent accounts from deployer...\n');

  const agents = getAgentConfigs().filter((a) =>
    ['risk', 'valuation', 'compliance'].includes(a.id),
  );

  for (const agent of agents) {
    try {
      const keyPair = loadKeyPairFromFile(path.resolve(agent.keyPath));
      console.log(`Funding ${agent.name}...`);
      await transferToAgent(deployerKeyPath, keyPair.publicKeyHex, agent.name);
      await new Promise((r) => setTimeout(r, 3000));
    } catch (err) {
      console.error(`  ✗ ${agent.name}: ${(err as Error).message}`);
    }
  }

  console.log('\nDone. Agents can now pay for cast_vote deploys (~2.5 CSPR each).');
}

main().catch(console.error);
