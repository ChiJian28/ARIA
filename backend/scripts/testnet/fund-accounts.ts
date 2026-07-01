import 'dotenv/config';
import axios from 'axios';
import { loadKeyPairFromFile } from '../../src/utils/crypto';
import { getAgentConfigs } from '../../src/config/agents';
import path from 'path';

const TESTNET_FAUCET_URL = 'https://faucet.testnet.casper.network/faucet';

async function fundAccount(publicKeyHex: string, name: string): Promise<void> {
  console.log(`Funding ${name} (${publicKeyHex.substring(0, 16)}...)...`);

  try {
    // TODO: Replace with real Casper testnet faucet API call
    // The faucet endpoint may require a specific format:
    // POST https://faucet.testnet.casper.network/faucet
    // Body: { "public_key_hex": "<hex>" }
    const response = await axios.post(TESTNET_FAUCET_URL, {
      public_key_hex: publicKeyHex,
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
    });

    console.log(`  ✓ Funded! Response: ${JSON.stringify(response.data)}`);
  } catch (err) {
    if (axios.isAxiosError(err)) {
      console.log(`  ✗ Faucet error: ${err.response?.status} ${JSON.stringify(err.response?.data)}`);
      console.log(`  → Try manually: https://testnet.casper.network/tools/faucet`);
    } else {
      console.log(`  ✗ Error: ${(err as Error).message}`);
    }
  }
}

async function main() {
  console.log('=== ARIA Testnet Account Funding ===\n');
  console.log('Note: Casper testnet faucet provides 1000 CSPR per request\n');

  const agentConfigs = getAgentConfigs();

  for (const agentConfig of agentConfigs) {
    try {
      const keyPair = loadKeyPairFromFile(path.resolve(agentConfig.keyPath));
      await fundAccount(`01${keyPair.publicKeyHex}`, agentConfig.name);
      // Rate limit: wait 2 seconds between requests
      await new Promise((r) => setTimeout(r, 2000));
    } catch (err) {
      console.log(`  Key not found for ${agentConfig.name}: run generate-agent-keys first`);
    }
  }

  console.log('\nFunding complete!');
  console.log('Check balances at: https://testnet.cspr.live/accounts');
}

main().catch(console.error);
