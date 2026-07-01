/**
 * Generate a deployer key pair for Casper Testnet contract deployment.
 *
 * The testnet faucet only funds an account — it does NOT give you a private key
 * unless you generated the key yourself first. Run this script, then fund the
 * printed public key at https://testnet.cspr.live/tools/faucet
 *
 * Usage:
 *   cd backend && npm run generate-deployer-key
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { Keys } from 'casper-js-sdk';

const OUT_DIR = path.resolve(__dirname, '../../keys/deployer');

async function main() {
  console.log('=== ARIA Deployer Key Generation ===\n');

  const keyPair = Keys.Ed25519.new();
  const publicKeyHex = keyPair.publicKey.toHex();
  const accountHash = keyPair.publicKey.toAccountHashStr();

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const secretPemPath = path.join(OUT_DIR, 'secret_key.pem');
  const publicPemPath = path.join(OUT_DIR, 'public_key.pem');
  const jsonPath = path.join(OUT_DIR, 'deployer.json');

  fs.writeFileSync(secretPemPath, keyPair.exportPrivateKeyInPem(), { mode: 0o600 });
  fs.writeFileSync(publicPemPath, keyPair.exportPublicKeyInPem(), { mode: 0o644 });
  fs.writeFileSync(
    jsonPath,
    JSON.stringify(
      {
        publicKey: publicKeyHex,
        accountHash,
        secretKeyPath: './keys/deployer/secret_key.pem',
      },
      null,
      2,
    ),
    { mode: 0o600 },
  );

  console.log('✓ Keys saved to backend/keys/deployer/');
  console.log(`  secret_key.pem`);
  console.log(`  public_key.pem`);
  console.log(`  deployer.json\n`);

  console.log('Public key (paste into faucet):');
  console.log(`  01${publicKeyHex}\n`);
  console.log('Account hash:');
  console.log(`  ${accountHash.replace(/^account-hash-/, '')}\n`);

  console.log('Next steps:');
  console.log('  1. Open https://testnet.cspr.live/tools/faucet');
  console.log('  2. Paste the public key above (starts with 01...)');
  console.log('  3. Wait ~1 min, then run: npm run deploy-contracts');
  console.log('\n⚠️  The faucet account you already have WITHOUT a .pem cannot deploy contracts.');
  console.log('    You must use THIS newly generated key and fund it via faucet.');
}

main().catch((err) => {
  console.error('Failed:', err.message || err);
  process.exit(1);
});
