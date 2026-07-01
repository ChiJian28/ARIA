/**
 * TEMP — deploy AgentCouncil only to verify Odra cfg args fix (error 64658).
 * Removed after successful test.
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import {
  CasperClient,
  CasperServiceByJsonRPC,
  DeployUtil,
  RuntimeArgs,
  Keys,
  CLValueBuilder,
} from 'casper-js-sdk';

const NODE_URL = process.env.CASPER_NODE_URL || 'https://node.testnet.casper.network/rpc';
const CHAIN_NAME = process.env.CASPER_NETWORK_NAME || 'casper-test';
const PAYMENT_MOTES = '200000000000';
const WASM_PATH = path.resolve(__dirname, '../../../contracts/wasm/AgentCouncil.wasm');

async function main() {
  const keyPath = process.env.DEPLOYER_SECRET_KEY_PATH;
  if (!keyPath) throw new Error('DEPLOYER_SECRET_KEY_PATH not set');
  const absKeyPath = path.resolve(__dirname, '../..', keyPath);
  const keyPair = Keys.Ed25519.loadKeyPairFromPrivateFile(absKeyPath);

  const initArgs = RuntimeArgs.fromMap({
    odra_cfg_is_upgradable: CLValueBuilder.bool(true),
    odra_cfg_is_upgrade: CLValueBuilder.bool(false),
    odra_cfg_allow_key_override: CLValueBuilder.bool(true),
    odra_cfg_package_hash_key_name: CLValueBuilder.string('agent_council'),
    threshold: CLValueBuilder.u32(3),
    max_agents: CLValueBuilder.u32(4),
  });

  const wasm = new Uint8Array(fs.readFileSync(WASM_PATH));
  const session = DeployUtil.ExecutableDeployItem.newModuleBytes(wasm, initArgs);
  const payment = DeployUtil.standardPayment(PAYMENT_MOTES);
  const deployParams = new DeployUtil.DeployParams(keyPair.publicKey, CHAIN_NAME, 1, 1_800_000);
  const signed = DeployUtil.signDeploy(DeployUtil.makeDeploy(deployParams, session, payment), keyPair);

  const client = new CasperClient(NODE_URL);
  const rpc = new CasperServiceByJsonRPC(NODE_URL);
  const deployHash = await client.putDeploy(signed);
  console.log('Submitted:', deployHash);
  console.log('Explorer: https://testnet.cspr.live/deploy/' + deployHash);

  for (let i = 0; i < 24; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const info = await rpc.getDeployInfo(deployHash);
    const res = info.execution_results?.[0]?.result;
    if (!res) continue;
    if ('Success' in res) {
      console.log('SUCCESS — Odra cfg args fix verified');
      return;
    }
    if ('Failure' in res) {
      console.error('FAILED:', (res as { Failure: { error_message: string } }).Failure.error_message);
      process.exit(1);
    }
  }
  console.error('Timeout waiting for deploy');
  process.exit(1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
