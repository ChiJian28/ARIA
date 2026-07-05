import axios from 'axios';
import { config } from '../../config';
import logger from '../../utils/logger';

const RWA_MINTED_MARKER = Buffer.from('event_RwaMinted');

interface Version2Effect {
  kind?: {
    Write?: {
      CLValue?: { bytes?: string };
    };
  };
}

function extractVersion2Effects(info: Record<string, unknown>): Version2Effect[] {
  const executionInfo = info.execution_info as {
    execution_result?: { Version2?: { effects?: Version2Effect[] } };
  } | undefined;
  return executionInfo?.execution_result?.Version2?.effects ?? [];
}

function tokenIdFromEffectBytes(bytesHex: string): string | null {
  const buf = Buffer.from(bytesHex, 'hex');
  const idx = buf.indexOf(RWA_MINTED_MARKER);
  if (idx < 0) return null;

  const pos = idx + RWA_MINTED_MARKER.length;
  if (pos + 8 > buf.length) return null;

  const tokenId = buf.readBigUInt64LE(pos);
  return tokenId > 0n ? tokenId.toString() : null;
}

/** Read CEP-78 token id from an on-chain mint_rwa deploy (Odra RwaMinted event). */
export async function parseRwaMintedTokenId(deployHash: string): Promise<string | null> {
  try {
    const response = await axios.post<{
      result?: Record<string, unknown>;
    }>(
      `${config.CASPER_NODE_URL}/rpc`,
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'info_get_deploy',
        params: { deploy_hash: deployHash, finalized_approvals: false },
      },
      { timeout: 30_000 },
    );

    const info = response.data?.result;
    if (!info) return null;

    for (const effect of extractVersion2Effects(info)) {
      const bytesHex = effect.kind?.Write?.CLValue?.bytes;
      if (!bytesHex) continue;
      const tokenId = tokenIdFromEffectBytes(bytesHex);
      if (tokenId) return tokenId;
    }

    return null;
  } catch (err) {
    logger.warn('Failed to parse RwaMinted token id', {
      deployHash,
      error: (err as Error).message,
    });
    return null;
  }
}
