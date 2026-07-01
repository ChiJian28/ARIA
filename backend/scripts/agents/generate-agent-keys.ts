import 'dotenv/config';
import path from 'path';
import { generateKeyPair, saveKeyPairToFile } from '../../src/utils/crypto';

const AGENT_KEYS = [
  { id: 'orchestrator', file: './keys/orchestrator.pem' },
  { id: 'risk', file: './keys/risk-agent.pem' },
  { id: 'valuation', file: './keys/valuation-agent.pem' },
  { id: 'compliance', file: './keys/compliance-agent.pem' },
  { id: 'sentinel', file: './keys/sentinel-agent.pem' },
];

async function main() {
  console.log('=== ARIA Agent Key Generation ===\n');

  for (const { id, file } of AGENT_KEYS) {
    const keyPair = generateKeyPair();
    saveKeyPairToFile(keyPair, path.resolve(file));

    console.log(`✓ ${id.padEnd(15)} Public Key: ${keyPair.publicKeyHex.substring(0, 32)}...`);
    console.log(`                 Account Hash: ${keyPair.accountHash}`);
    console.log(`                 Saved to: ${file}\n`);
  }

  console.log('\n⚠️  IMPORTANT:');
  console.log('  1. Run "npm run fund-accounts" to fund each agent on testnet');
  console.log('  2. Run "npm run register-agents" to register agents in AgentCouncil');
  console.log('  3. Keep keys/ directory secure — never commit to git!');
}

main().catch(console.error);
