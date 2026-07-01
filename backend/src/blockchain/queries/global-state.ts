import { getRpcService } from '../client';
import logger from '../../utils/logger';

export async function queryContractNamedKey(
  contractHash: string,
  key: string,
): Promise<unknown> {
  try {
    const rpc = getRpcService();
    const stateRootHash = await rpc.getStateRootHash();
    // Use getBlockState which is the correct method name in casper-js-sdk 2.x
    // TODO: Verify exact API for casper-js-sdk 2.15.x
    const result = await (rpc as unknown as {
      getBlockState: (hash: string, key: string, path: string[]) => Promise<unknown>;
    }).getBlockState(stateRootHash, `hash-${contractHash}`, [key]);
    return result;
  } catch (err) {
    logger.warn('Failed to query named key', { contractHash, key, error: (err as Error).message });
    return null;
  }
}

export async function queryDictionary(
  contractHash: string,
  dictionaryName: string,
  itemKey: string,
): Promise<unknown> {
  try {
    const rpc = getRpcService();
    const stateRootHash = await rpc.getStateRootHash();
    const result = await rpc.getDictionaryItemByName(
      stateRootHash,
      contractHash,
      dictionaryName,
      itemKey,
    );
    return result;
  } catch (err) {
    logger.warn('Failed to query dictionary', {
      contractHash,
      dictionaryName,
      itemKey,
      error: (err as Error).message,
    });
    return null;
  }
}
