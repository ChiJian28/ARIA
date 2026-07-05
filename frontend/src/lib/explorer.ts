import { EXPLORER_URL } from '@/lib/constants';

/** Normalize deploy / transaction hash for testnet.cspr.live links. */
export function normalizeExplorerHash(hash: string): string {
  return hash.replace(/^0x/i, '').toLowerCase();
}

export function explorerDeployUrl(deployHash: string): string {
  return `${EXPLORER_URL}/deploy/${normalizeExplorerHash(deployHash)}`;
}

export function explorerAccountUrl(publicKeyHex: string): string {
  return `${EXPLORER_URL}/account/${publicKeyHex}`;
}

/** RWA registry contract package — metadata lives in mint deploy, not as a searchable UUID. */
export function explorerContractUrl(contractOrPackageHash: string): string {
  const key = contractOrPackageHash.startsWith('hash-') || contractOrPackageHash.startsWith('contract-')
    ? contractOrPackageHash
    : `hash-${normalizeExplorerHash(contractOrPackageHash)}`;
  return `${EXPLORER_URL}/contract/${key}`;
}
