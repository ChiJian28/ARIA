/**
 * Smoke-test: build + submit a mint_rwa deploy (does not run full pipeline).
 * Usage: cd backend && npx ts-node scripts/testnet/test-mint-deploy.ts
 */
import 'dotenv/config';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../../src/config';
import { mintRwaNft } from '../../src/blockchain/contracts/rwa-registry';
import { publicKeyFromKeyFile } from '../../src/blockchain/transactions/casper-keys';

async function main() {
  const minterPk = publicKeyFromKeyFile(config.DEPLOYER_SECRET_KEY_PATH);
  console.log('Minter (deployer) public key:', minterPk.toHex());
  console.log('RWA Registry package:', config.RWA_REGISTRY_PACKAGE_HASH);

  const rwaId = `test-mint-${uuidv4()}`;
  const ownerPk = minterPk.toHex(); // mint to deployer for smoke test

  console.log('\nSubmitting mint_rwa for', rwaId);
  const result = await mintRwaNft(rwaId, ownerPk, {
    rwaId,
    assetType: 'INVOICE',
    faceValue: '10000',
    currency: 'USD',
    issuerName: 'Test Issuer',
    issuerCountry: 'SG',
    buyerName: 'Test Buyer',
    buyerCountry: 'US',
    issueDate: new Date().toISOString(),
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString(),
    riskScore: '0.05',
    collateralRatio: '0.75',
    approvedAt: new Date().toISOString(),
  });

  console.log('\nResult:', result);
  if (result.deployHash && !result.deployHash.startsWith('mock-')) {
    console.log(`View: https://testnet.cspr.live/deploy/${result.deployHash}`);
  }
}

main().catch((err) => {
  console.error('Mint test failed:', err.message ?? err);
  process.exit(1);
});
