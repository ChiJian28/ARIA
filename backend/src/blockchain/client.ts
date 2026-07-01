import { CasperClient, CasperServiceByJsonRPC } from 'casper-js-sdk';
import { getCasperConfig } from '../config/casper';
import logger from '../utils/logger';

let casperClient: CasperClient | null = null;
let rpcService: CasperServiceByJsonRPC | null = null;

export function getCasperClient(): CasperClient {
  if (!casperClient) {
    const casperConfig = getCasperConfig();
    casperClient = new CasperClient(casperConfig.nodeUrl);
    logger.info('Casper client initialized', { nodeUrl: casperConfig.nodeUrl });
  }
  return casperClient;
}

export function getRpcService(): CasperServiceByJsonRPC {
  if (!rpcService) {
    const casperConfig = getCasperConfig();
    rpcService = new CasperServiceByJsonRPC(casperConfig.nodeUrl);
  }
  return rpcService;
}

export async function getLatestBlockInfo(): Promise<{
  blockHash: string;
  blockHeight: number;
  stateRootHash: string;
} | null> {
  try {
    const rpc = getRpcService();
    const blockInfo = await rpc.getLatestBlockInfo();
    const block = blockInfo.block;
    if (!block) return null;

    return {
      blockHash: block.hash,
      blockHeight: block.header.height,
      stateRootHash: block.header.state_root_hash,
    };
  } catch (err) {
    logger.warn('Failed to get latest block', { error: (err as Error).message });
    return null;
  }
}

export async function getAccountBalance(publicKeyHex: string): Promise<string> {
  try {
    const rpc = getRpcService();
    const stateRootHash = await rpc.getStateRootHash();
    // getAccountBalanceUrefByPublicKey takes a CLPublicKey
    // For balance queries, use the REST API instead
    // TODO: Implement proper balance query with CLPublicKey
    logger.debug('Balance query for', { publicKeyHex: publicKeyHex.substring(0, 16) });
    return '0';
  } catch {
    return '0';
  }
}
