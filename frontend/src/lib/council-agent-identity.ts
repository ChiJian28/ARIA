import { explorerAccountUrl } from '@/lib/explorer';
import { formatAddress } from '@/lib/formatters';
import type { AgentInfo, LeaderboardEntry } from '@/types/api.types';

export function resolveAgentPublicKey(
  agentId: string,
  agents?: AgentInfo[],
  leaderboard?: LeaderboardEntry[],
): string | null {
  return (
    agents?.find((a) => a.id === agentId)?.agentPublicKey ??
    leaderboard?.find((e) => e.agentId === agentId)?.agentPublicKey ??
    null
  );
}

export function formatAgentOnChainLabel(publicKey: string | null): string {
  if (!publicKey) return 'On-chain: —';
  return formatAddress(publicKey, 6);
}

export function agentOnChainExplorerUrl(publicKey: string | null): string | null {
  if (!publicKey) return null;
  return explorerAccountUrl(publicKey);
}
