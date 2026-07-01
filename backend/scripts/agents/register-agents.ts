import 'dotenv/config';
import { loadKeyPairFromFile } from '../../src/utils/crypto';
import { registerAgent } from '../../src/blockchain/contracts/agent-council';
import { getAgentConfigs } from '../../src/config/agents';
import { config } from '../../src/config';
import path from 'path';

const DEPLOYER_KEY_PATH = config.DEPLOYER_SECRET_KEY_PATH;

async function main() {
  console.log('=== ARIA Agent Registration ===\n');
  console.log(`Network: ${config.CASPER_NETWORK_NAME}`);
  console.log(`Agent Council: ${config.AGENT_COUNCIL_CONTRACT_HASH ?? 'NOT DEPLOYED'}\n`);

  if (!config.AGENT_COUNCIL_CONTRACT_HASH) {
    console.log('⚠️  AgentCouncil contract not deployed yet.');
    console.log('   Run contract deployment scripts first, then update AGENT_COUNCIL_CONTRACT_HASH in .env');
    process.exit(1);
  }

  const agentConfigs = getAgentConfigs().filter((a) =>
    ['risk', 'valuation', 'compliance', 'sentinel'].includes(a.id),
  );

  for (const agentConfig of agentConfigs) {
    try {
      const keyPair = loadKeyPairFromFile(path.resolve(agentConfig.keyPath));
      console.log(`Registering ${agentConfig.name}...`);
      console.log(`  Public Key: ${keyPair.publicKeyHex.substring(0, 32)}...`);

      const result = await registerAgent(
        keyPair.publicKeyHex,
        agentConfig.id,
        agentConfig.voteWeight,
        DEPLOYER_KEY_PATH,
      );

      console.log(`  ✓ Registered! Deploy hash: ${result.deployHash}\n`);
    } catch (err) {
      console.error(`  ✗ Failed to register ${agentConfig.name}: ${(err as Error).message}\n`);
    }
  }

  console.log('Registration complete!');
}

main().catch(console.error);
