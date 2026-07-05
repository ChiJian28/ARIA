import { parseRwaMintedTokenId } from '../../blockchain/queries/rwa-mint';
import { rwaRepo } from '../../db/repositories/rwa.repo';
import logger from '../../utils/logger';

/** Resolve nft token id from DB or backfill from mint deploy effects. */
export async function resolveNftTokenId(
  rwaId: string,
  opts: { nftTokenId?: string | null; mintTxHash?: string | null },
): Promise<string | null> {
  if (opts.nftTokenId) return opts.nftTokenId;
  if (!opts.mintTxHash) return null;

  const tokenId = await parseRwaMintedTokenId(opts.mintTxHash);
  if (!tokenId) return null;

  try {
    await rwaRepo.setNftTokenId(rwaId, tokenId);
    logger.info('Backfilled nft_token_id from mint deploy', { rwa_id: rwaId, tokenId });
  } catch (err) {
    logger.warn('Failed to persist backfilled nft_token_id', {
      rwa_id: rwaId,
      error: (err as Error).message,
    });
  }

  return tokenId;
}
