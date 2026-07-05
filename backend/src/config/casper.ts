import { config } from './index';

export function getCasperConfig() {
  return {
    nodeUrl: config.CASPER_NODE_URL,
    sseUrl: config.CASPER_SSE_URL,
    networkName: config.CASPER_NETWORK_NAME,
    contracts: {
      rwaRegistry: {
        contractHash: config.RWA_REGISTRY_CONTRACT_HASH,
        packageHash: config.RWA_REGISTRY_PACKAGE_HASH,
      },
      liquidityVault: {
        contractHash: config.LIQUIDITY_VAULT_CONTRACT_HASH,
        packageHash: config.LIQUIDITY_VAULT_PACKAGE_HASH,
      },
      agentCouncil: {
        contractHash: config.AGENT_COUNCIL_CONTRACT_HASH,
        packageHash: config.AGENT_COUNCIL_PACKAGE_HASH,
      },
      settlementEngine: {
        contractHash: config.SETTLEMENT_ENGINE_CONTRACT_HASH,
        packageHash: config.SETTLEMENT_ENGINE_PACKAGE_HASH,
      },
    },
    // Classic pricing mode gas costs (in motes, 1 CSPR = 1_000_000_000 motes)
    gasCosts: {
      mint: '2500000000',     // 2.5 CSPR
      vote: '2500000000',     // 2.5 CSPR (0.5 CSPR rejected as Invalid Deploy on testnet)
      transfer: '100000000',  // 0.1 CSPR
      deposit: '10000000000', // 10 CSPR (proxy caller WASM needs more gas than direct call)
      withdraw: '5000000000', // 5 CSPR (2 CSPR rejected as Invalid Deploy on testnet)
      liquidate: '2000000000',// 2 CSPR
      settlement: '10000000000', // payable settlement / yield (proxy caller)
    },
  };
}
