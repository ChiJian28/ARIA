import { CasperClient, CasperServiceByJsonRPC, PurseIdentifier } from 'casper-js-sdk';
import { getCasperConfig } from '../config/casper';
import { publicKeyFromHex } from './transactions/casper-keys';
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
    const publicKey = publicKeyFromHex(publicKeyHex);
    const balance = await rpc.queryBalance(
      PurseIdentifier.MainPurseUnderPublicKey,
      publicKey.toHex(),
    );
    return balance.toString();
  } catch (err) {
    logger.debug('Balance query failed', {
      publicKeyHex: publicKeyHex.substring(0, 16),
      error: (err as Error).message,
    });
    return '0';
  }
}
