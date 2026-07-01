/**
 * Deploy all 4 ARIA smart contracts to Casper Testnet.
 *
 * Prerequisites:
 *   1. Run `make build` inside contracts/ to produce WASM binaries
 *   2. Set DEPLOYER_SECRET_KEY_PATH in backend/.env (path to your secret_key.pem)
 *   3. Make sure the deployer account has enough CSPR (≥ 1000 CSPR recommended)
 *
 * Usage:
 *   cd backend && npm run deploy-contracts
 *
 * After success, contract hashes are printed + saved to backend/.deployed.json.
 * Copy those values into backend/.env.
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { CasperClient, CasperServiceByJsonRPC, DeployUtil, RuntimeArgs, Keys, CLValueBuilder, CLAccountHash, CLByteArray, CLValue } from 'casper-js-sdk';

// ── Config ────────────────────────────────────────────────────────────────────
const NODE_URL    = process.env.CASPER_NODE_URL    || 'https://node.testnet.casper.network/rpc';
const CHAIN_NAME  = process.env.CASPER_NETWORK_NAME || 'casper-test';
// 500 CSPR — default for ~196 KB Odra WASM (testnet block gas limit ~850 CSPR)
const PAYMENT_MOTES = '500000000000';
// 800 CSPR — large contracts (~267 KB); max safe payment under testnet block gas limit
const HEAVY_PAYMENT_MOTES = '800000000000';
const HEAVY_CONTRACTS = new Set(['liquidity-vault', 'settlement-engine']);
const DEPLOY_TTL_MS = 60 * 60 * 1000; // 1 hour
// Deployable WASM from `cargo odra build` (includes `call` export)
const WASM_DIR = path.resolve(__dirname, '../../..', 'contracts/wasm');

interface DeployContext {
  deployerAccountHash: string;
  deployedHashes: Record<string, string>;
}

interface ContractSpec {
  label: string;
  wasmFile: string;
  envKey: string;
  packageEnvKey: string;
  /** Named key Odra stores on the deployer account after install */
  namedKey: string;
  buildInitArgs: (ctx: DeployContext) => Record<string, CLValue>;
}

const CONTRACTS: ContractSpec[] = [
  {
    label:    'agent-council',
    wasmFile: 'AgentCouncil.wasm',
    envKey:   'AGENT_COUNCIL_CONTRACT_HASH',
    packageEnvKey: 'AGENT_COUNCIL_PACKAGE_HASH',
    namedKey: 'agent_council',
    buildInitArgs: () => ({
      threshold: CLValueBuilder.u32(3),
      max_agents: CLValueBuilder.u32(4),
    }),
  },
  {
    label:    'rwa-registry',
    wasmFile: 'RwaRegistry.wasm',
    envKey:   'RWA_REGISTRY_CONTRACT_HASH',
    packageEnvKey: 'RWA_REGISTRY_PACKAGE_HASH',
    namedKey: 'rwa_registry',
    buildInitArgs: (ctx) => ({
      minter: keyFromAccountHash(ctx.deployerAccountHash),
    }),
  },
  {
    label:    'liquidity-vault',
    wasmFile: 'LiquidityVault.wasm',
    envKey:   'LIQUIDITY_VAULT_CONTRACT_HASH',
    packageEnvKey: 'LIQUIDITY_VAULT_PACKAGE_HASH',
    namedKey: 'liquidity_vault',
    buildInitArgs: () => ({
      name: CLValueBuilder.string('ARIA LP Token'),
      symbol: CLValueBuilder.string('ARIA-LP'),
    }),
  },
  {
    label:    'settlement-engine',
    wasmFile: 'SettlementEngine.wasm',
    envKey:   'SETTLEMENT_ENGINE_CONTRACT_HASH',
    packageEnvKey: 'SETTLEMENT_ENGINE_PACKAGE_HASH',
    namedKey: 'settlement_engine',
    buildInitArgs: (ctx) => {
      // Odra Address::Contract expects the vault *package* hash, not the instance contract hash
      const vaultPackageHash = ctx.deployedHashes.LIQUIDITY_VAULT_PACKAGE_HASH;
      if (!vaultPackageHash) {
        throw new Error('LiquidityVault must be deployed before SettlementEngine');
      }
      return {
        protocol_fee_bps: CLValueBuilder.u32(50),
        vault_address: keyFromHashKey(vaultPackageHash),
      };
    },
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

/** account-hash-xxx → CLKey for Odra Address / Casper session args */
function keyFromAccountHash(accountHashStr: string) {
  const hex = accountHashStr.replace(/^account-hash-/, '');
  return CLValueBuilder.key(new CLAccountHash(Buffer.from(hex, 'hex')));
}

/** hash-xxx / contract-xxx → CLKey (Hash / package) for Odra Address::Contract */
function keyFromHashKey(keyStr: string) {
  const hex = keyStr.replace(/^(hash-|contract-)/, '');
  // SDK adds the Key tag (0x01) — do NOT prepend manually or you get "left-over bytes"
  return CLValueBuilder.key(new CLByteArray(Buffer.from(hex, 'hex')));
}

/** @deprecated alias — use keyFromHashKey */
function keyFromContractHash(keyStr: string) {
  return keyFromHashKey(keyStr);
}

/**
 * Odra WASM `call()` install requires these cfg args in addition to constructor args.
 * Missing them reverts with Odra ExecutionError::MissingArg (user error 64658).
 */
function buildOdraDeployArgs(
  namedKey: string,
  initArgs: Record<string, CLValue>,
): RuntimeArgs {
  return RuntimeArgs.fromMap({
    odra_cfg_is_upgradable: CLValueBuilder.bool(true),
    odra_cfg_is_upgrade: CLValueBuilder.bool(false),
    odra_cfg_allow_key_override: CLValueBuilder.bool(true),
    odra_cfg_package_hash_key_name: CLValueBuilder.string(namedKey),
    ...initArgs,
  });
}

type DeployOutcome = 'success' | 'failure' | 'pending';

interface ParsedDeployResult {
  outcome: DeployOutcome;
  errorMessage?: string;
  blockHash?: string;
}

/** Parse Casper 1.x (execution_results) and 2.x (execution_info.Version2) deploy responses. */
function parseDeployResult(info: Record<string, unknown>): ParsedDeployResult {
  // Casper 2.x — chain_get_deploy returns execution_info
  const executionInfo = info.execution_info as {
    block_hash?: string;
    execution_result?: Record<string, unknown>;
  } | undefined;

  if (executionInfo?.execution_result) {
    const er = executionInfo.execution_result;

    // Version2 (current testnet)
    if ('Version2' in er) {
      const v2 = er.Version2 as { error_message?: string | null };
      if (v2.error_message) {
        return { outcome: 'failure', errorMessage: v2.error_message, blockHash: executionInfo.block_hash };
      }
      return { outcome: 'success', blockHash: executionInfo.block_hash };
    }

    // Version1 fallback
    if ('Success' in er) {
      return { outcome: 'success', blockHash: executionInfo.block_hash };
    }
    if ('Failure' in er) {
      const body = er.Failure as { error_message?: string };
      return { outcome: 'failure', errorMessage: body?.error_message ?? 'unknown error', blockHash: executionInfo.block_hash };
    }
  }

  // Casper 1.x legacy — execution_results array
  const results = info.execution_results as { result?: Record<string, unknown> }[] | undefined;
  if (results?.length) {
    const res = results[0].result ?? {};
    if ('Success' in res) return { outcome: 'success' };
    if ('Failure' in res) {
      const body = res.Failure as { error_message?: string };
      return { outcome: 'failure', errorMessage: body?.error_message ?? 'unknown error' };
    }
  }

  return { outcome: 'pending' };
}

async function waitForDeploy(
  rpc: CasperServiceByJsonRPC,
  deployHash: string,
  maxWaitMs = 300_000,
): Promise<{ status: 'success' | 'failure' | 'timeout'; errorMessage?: string }> {
  const pollMs = 2_000;
  const deadline = Date.now() + maxWaitMs;
  let lastRpcError: string | undefined;
  let lastChainError: string | undefined;

  while (Date.now() < deadline) {
    await sleep(pollMs);
    try {
      const info = await rpc.getDeployInfo(deployHash) as unknown as Record<string, unknown>;
      const parsed = parseDeployResult(info);

      if (parsed.outcome === 'success') {
        if (parsed.blockHash) {
          console.log(`\n   Block: ${parsed.blockHash}`);
        }
        return { status: 'success' };
      }
      if (parsed.outcome === 'failure') {
        lastChainError = parsed.errorMessage ?? 'unknown error';
        console.error(`\n   [chain error] ${lastChainError}`);
        return { status: 'failure', errorMessage: lastChainError };
      }
      lastRpcError = undefined;
    } catch (err) {
      const msg = (err as Error).message ?? String(err);
      if (/not found|Unknown deploy|Invalid params|does not exist/i.test(msg)) {
        lastRpcError = undefined;
      } else {
        lastRpcError = msg;
        console.warn(`\n   [rpc warn] ${msg}`);
      }
    }
    process.stdout.write('.');
  }

  try {
    const info = await rpc.getDeployInfo(deployHash) as unknown as Record<string, unknown>;
    const parsed = parseDeployResult(info);
    if (parsed.outcome === 'success') return { status: 'success' };
    if (parsed.outcome === 'failure') {
      lastChainError = parsed.errorMessage ?? 'unknown error';
      console.error(`\n   [chain error] ${lastChainError}`);
      return { status: 'failure', errorMessage: lastChainError };
    }
  } catch {
    // ignore
  }

  if (lastRpcError) {
    console.error(`\n   [rpc error] last error: ${lastRpcError}`);
  }
  return { status: 'timeout', errorMessage: lastChainError };
}

interface NamedKeyEntry {
  name: string;
  key: string;
}

/** casper-js-sdk returns camelCase (namedKeys); RPC JSON may use snake_case. */
function readAccountNamedKeys(accountState: Record<string, unknown>): NamedKeyEntry[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const account = (accountState as any)?.Account ?? (accountState as any)?.account;
  const keys = account?.namedKeys ?? account?.named_keys;
  return Array.isArray(keys) ? keys : [];
}

function paymentMotesForContract(label: string): string {
  return HEAVY_CONTRACTS.has(label) ? HEAVY_PAYMENT_MOTES : PAYMENT_MOTES;
}

/** Pull package + contract hash from deploy execution effects (most reliable right after deploy). */
function extractHashesFromDeployEffects(
  info: Record<string, unknown>,
  namedKey: string,
): { packageHash?: string; contractHash?: string } {
  const executionInfo = info.execution_info as {
    execution_result?: { Version2?: { effects?: Record<string, unknown>[] } };
  } | undefined;
  const effects = executionInfo?.execution_result?.Version2?.effects ?? [];

  let packageHash: string | undefined;
  let contractHash: string | undefined;

  const namedKeyCandidates = new Set([
    namedKey,
    `${namedKey}_package`,
    `${namedKey}_contract`,
  ]);

  for (const effect of effects) {
    const kind = effect.kind as Record<string, unknown> | undefined;
    if (!kind) continue;

    const addKeys = kind.AddKeys as NamedKeyEntry[] | undefined;
    if (addKeys) {
      for (const nk of addKeys) {
        if (namedKeyCandidates.has(nk.name)) {
          packageHash = nk.key;
        }
      }
    }

    const write = kind.Write as Record<string, unknown> | undefined;
    const pkg = write?.ContractPackage as {
      versions?: { contract_version?: number; contractVersion?: number; contract_hash?: string; contractHash?: string }[];
    } | undefined;

    if (pkg?.versions?.length) {
      const latest = pkg.versions.reduce((best, cur) => {
        const bestVer = best.contractVersion ?? best.contract_version ?? 0;
        const curVer = cur.contractVersion ?? cur.contract_version ?? 0;
        return curVer > bestVer ? cur : best;
      });
      contractHash = latest.contractHash ?? latest.contract_hash;
      if (!packageHash && typeof effect.key === 'string' && effect.key.startsWith('hash-')) {
        packageHash = effect.key;
      }
    }
  }

  return { packageHash, contractHash };
}

async function getPackageHashFromNamedKey(
  rpc: CasperServiceByJsonRPC,
  accountHashStr: string,
  namedKey: string,
): Promise<string | null> {
  try {
    const stateRootHash = await rpc.getStateRootHash();
    const accountKey = accountHashStr.startsWith('account-hash-')
      ? accountHashStr
      : `account-hash-${accountHashStr}`;
    const account = await rpc.getBlockState(stateRootHash, accountKey, []);
    const namedKeys = readAccountNamedKeys(account as Record<string, unknown>);

    const candidates = [namedKey, `${namedKey}_package`, `${namedKey}_contract`];
    for (const candidate of candidates) {
      const entry = namedKeys.find(nk => nk.name === candidate);
      if (entry?.key) return entry.key;
    }
    return null;
  } catch {
    return null;
  }
}

/** Resolve the active contract hash from an Odra package hash key (hash-xxx). */
async function resolveContractHashFromPackage(
  rpc: CasperServiceByJsonRPC,
  packageKey: string,
): Promise<string | null> {
  try {
    const stateRootHash = await rpc.getStateRootHash();
    const state = await rpc.getBlockState(stateRootHash, packageKey, []);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pkg = (state as any)?.ContractPackage ?? (state as any)?.contractPackage;
    const versions = pkg?.versions ?? [];
    if (!versions.length) return null;

    const disabled = new Set<number>(
      (pkg.disabledVersions ?? pkg.disabled_versions ?? []).map(
        (v: { contractVersion?: number; contract_version?: number }) =>
          v.contractVersion ?? v.contract_version ?? 0,
      ),
    );
    const activeVersions = versions.filter(
      (v: { contractVersion?: number; contract_version?: number }) =>
        !disabled.has(v.contractVersion ?? v.contract_version ?? 0),
    );
    if (!activeVersions.length) return null;

    const latest = activeVersions.reduce(
      (
        best: { contractVersion?: number; contract_version?: number; contractHash?: string; contract_hash?: string },
        cur: { contractVersion?: number; contract_version?: number; contractHash?: string; contract_hash?: string },
      ) => {
        const bestVer = best.contractVersion ?? best.contract_version ?? 0;
        const curVer = cur.contractVersion ?? cur.contract_version ?? 0;
        return curVer > bestVer ? cur : best;
      },
    );
    return latest.contractHash ?? latest.contract_hash ?? null;
  } catch {
    return null;
  }
}

async function loadExistingDeployments(
  rpc: CasperServiceByJsonRPC,
  accountHashStr: string,
  deployedHashes: Record<string, string>,
): Promise<void> {
  const stateRootHash = await rpc.getStateRootHash();
  const accountState = await rpc.getBlockState(stateRootHash, accountHashStr, []);
  const namedKeys = readAccountNamedKeys(accountState as Record<string, unknown>);
  if (!namedKeys.length) return;

  console.log('Existing account named keys:', namedKeys.map(nk => nk.name).join(', '));
  console.log();

  for (const spec of CONTRACTS) {
    const packageHash = namedKeys.find(nk => nk.name === spec.namedKey)?.key;
    if (!packageHash) continue;

    deployedHashes[spec.packageEnvKey] = packageHash;
    const contractHash = await resolveContractHashFromPackage(rpc, packageHash);
    if (contractHash) {
      deployedHashes[spec.envKey] = contractHash;
      console.log(`↪ Skipping ${spec.label} — already deployed`);
      console.log(`   ${spec.packageEnvKey}=${packageHash}`);
      console.log(`   ${spec.envKey}=${contractHash}`);
      console.log();
    }
  }
}

function isAlreadyDeployed(spec: ContractSpec, deployedHashes: Record<string, string>): boolean {
  return Boolean(deployedHashes[spec.envKey] && deployedHashes[spec.packageEnvKey]);
}
async function main() {
  // 1. Load deployer key
  const keyPath = process.env.DEPLOYER_SECRET_KEY_PATH;
  if (!keyPath) {
    throw new Error(
      'DEPLOYER_SECRET_KEY_PATH is not set in .env\n' +
      'Set it to the path of your Casper testnet secret_key.pem file.\n' +
      'Example: DEPLOYER_SECRET_KEY_PATH=./keys/deployer/secret_key.pem',
    );
  }
  const absKeyPath = path.resolve(__dirname, '../..', keyPath);
  if (!fs.existsSync(absKeyPath)) {
    throw new Error(
      `Secret key file not found: ${absKeyPath}\n` +
      'Run: npm run generate-deployer-key\n' +
      'Then fund the printed public key at https://testnet.cspr.live/tools/faucet',
    );
  }

  const keyPair = Keys.Ed25519.loadKeyPairFromPrivateFile(absKeyPath);
  console.log('✓ Deployer public key:', keyPair.publicKey.toHex());
  console.log('  Node:', NODE_URL);
  console.log('  Chain:', CHAIN_NAME);
  console.log('  WASM dir:', WASM_DIR);
  console.log();

  const client = new CasperClient(NODE_URL);
  const rpc    = new CasperServiceByJsonRPC(NODE_URL);

  const deployedHashes: Record<string, string> = {};
  const deployCtx: DeployContext = {
    deployerAccountHash: keyPair.publicKey.toAccountHashStr(),
    deployedHashes,
  };

  const accountHashStr = keyPair.publicKey.toAccountHashStr();
  const forceRedeploy = process.env.FORCE_REDEPLOY === '1';
  if (!forceRedeploy) {
    await loadExistingDeployments(rpc, accountHashStr, deployedHashes);
  }

  // 2. Deploy each contract
  for (const spec of CONTRACTS) {
    if (!forceRedeploy && isAlreadyDeployed(spec, deployedHashes)) {
      continue;
    }
    const wasmPath = path.join(WASM_DIR, spec.wasmFile);
    if (!fs.existsSync(wasmPath)) {
      console.error(`❌ WASM not found: ${wasmPath}`);
      console.error('   Did you run: cd contracts && make build');
      continue;
    }

    const wasmSize = fs.statSync(wasmPath).size;
    console.log(`🚀 Deploying ${spec.label}... (${Math.round(wasmSize / 1024)} KB)`);

    try {
      buildOdraDeployArgs(spec.namedKey, spec.buildInitArgs(deployCtx));
    } catch (err) {
      console.error(`   ❌ ${(err as Error).message}`);
      continue;
    }

    const wasm    = new Uint8Array(fs.readFileSync(wasmPath));
    const motes = paymentMotesForContract(spec.label);
    const cspr = (Number(motes) / 1e9).toFixed(0);

    const maxAttempts = 2;
    let deployHash: string | undefined;
    let waitResult: { status: 'success' | 'failure' | 'timeout'; errorMessage?: string } = { status: 'failure' };
    let submitError: string | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const initArgsAttempt = buildOdraDeployArgs(spec.namedKey, spec.buildInitArgs(deployCtx));
      const session = DeployUtil.ExecutableDeployItem.newModuleBytes(wasm, initArgsAttempt);
      const payment = DeployUtil.standardPayment(motes);
      const deployParams = new DeployUtil.DeployParams(
        keyPair.publicKey,
        CHAIN_NAME,
        1,
        DEPLOY_TTL_MS,
      );
      const deploy = DeployUtil.makeDeploy(deployParams, session, payment);
      const signed = DeployUtil.signDeploy(deploy, keyPair);

      try {
        deployHash = await client.putDeploy(signed);
      } catch (err) {
        submitError = (err as Error).message;
        console.error(`   ❌ Failed to submit: ${submitError}`);
        break;
      }

      console.log(`   Payment: ${cspr} CSPR${attempt > 1 ? ` (retry ${attempt}/${maxAttempts})` : ''}`);
      console.log(`   Deploy hash: ${deployHash}`);
      console.log('   Waiting for finality', { maxWait: '300s', poll: '2s', ttl: '1h' });

      waitResult = await waitForDeploy(rpc, deployHash);
      console.log();

      if (waitResult.status === 'success') break;
      if (waitResult.status === 'failure' && /out of gas/i.test(waitResult.errorMessage ?? '') && attempt < maxAttempts) {
        console.warn('   ↻ Out of gas — retrying with fresh deploy...');
        continue;
      }
      break;
    }

    if (!deployHash || waitResult.status !== 'success') {
      console.error(`   ❌ Deploy ${waitResult.status}. Check: https://testnet.cspr.live/deploy/${deployHash ?? 'unknown'}`);
      continue;
    }

    console.log(`   ✅ Confirmed! Resolving contract hashes...`);

    const accountHashStr = keyPair.publicKey.toAccountHashStr();

    // 1) Prefer deploy execution effects (immediate, no state lag)
    const deployInfo = await rpc.getDeployInfo(deployHash) as unknown as Record<string, unknown>;
    let { packageHash, contractHash } = extractHashesFromDeployEffects(deployInfo, spec.namedKey);

    // 2) Fallback: query deployer account named keys (SDK uses camelCase namedKeys)
    if (!packageHash) {
      const stateRootHash = await rpc.getStateRootHash();
      const accountState = await rpc.getBlockState(stateRootHash, accountHashStr, []);
      const namedKeys = readAccountNamedKeys(accountState as Record<string, unknown>);
      console.log('   Account named keys:', namedKeys.map(nk => nk.name).join(', ') || '(none)');
      packageHash = await getPackageHashFromNamedKey(rpc, accountHashStr, spec.namedKey) ?? undefined;
    }

    if (packageHash) {
      console.log(`   Package hash: ${packageHash}`);
      deployedHashes[spec.packageEnvKey] = packageHash;

      if (!contractHash) {
        contractHash = (await resolveContractHashFromPackage(rpc, packageHash)) ?? undefined;
      }
      if (contractHash) {
        console.log(`   Contract hash: ${contractHash}`);
        deployedHashes[spec.envKey] = contractHash;
      } else {
        console.warn(`   ⚠️  Could not resolve contract hash from package.`);
        console.warn(`   Set ${spec.envKey} manually from: https://testnet.cspr.live/deploy/${deployHash}`);
      }
    } else {
      console.warn(`   ⚠️  Could not auto-retrieve package hash.`);
      console.warn(`   Look up manually on: https://testnet.cspr.live/deploy/${deployHash}`);
      console.warn(`   Then set ${spec.envKey} and ${spec.packageEnvKey} in backend/.env`);
    }
    console.log();
  }

  // 3. Summary
  console.log('═══════════════════════════════════════════');
  console.log('  DEPLOYED CONTRACT HASHES');
  console.log('  Copy these into backend/.env:');
  console.log('═══════════════════════════════════════════\n');
  for (const [key, value] of Object.entries(deployedHashes)) {
    console.log(`${key}=${value}`);
  }

  // 4. Save to .deployed.json
  const outPath = path.resolve(__dirname, '../..', '.deployed.json');
  const existing = fs.existsSync(outPath)
    ? JSON.parse(fs.readFileSync(outPath, 'utf8'))
    : {};
  fs.writeFileSync(outPath, JSON.stringify({
    ...existing,
    deployedAt: new Date().toISOString(),
    ...deployedHashes,
  }, null, 2));
  console.log(`\n✅ Saved to .deployed.json`);
  console.log('\nNext steps:');
  console.log('  1. Copy the hashes above into backend/.env');
  console.log('  2. npm run generate-keys  (if agent keys not yet generated)');
  console.log('  3. npm run register-agents');
}

main().catch(err => {
  console.error('\n❌ Deploy failed:', err.message || err);
  process.exit(1);
});
