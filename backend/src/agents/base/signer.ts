import path from 'path';
import { loadKeyPairFromFile, signMessage } from '../../utils/crypto';
import { getAgentConfigs, AgentId } from '../../config/agents';
import { normalizePublicKeyHex } from '../../blockchain/transactions/casper-keys';
import logger from '../../utils/logger';

export interface AgentSignature {
  agentId: AgentId;
  publicKeyHex: string;
  accountHash: string;
  signature: string;
  payload: string;
  keyPath: string;
}

export function getAgentKeyPath(agentId: AgentId): string {
  const configs = getAgentConfigs();
  const agentConfig = configs.find((c) => c.id === agentId);
  if (!agentConfig) {
    throw new Error(`Unknown agent: ${agentId}`);
  }
  return agentConfig.keyPath;
}

/** Casper account public key hex for explorer links; null when keys are missing or mocked. */
export function resolveAgentPublicKeyHex(agentId: AgentId): string | null {
  try {
    const keyPath = getAgentKeyPath(agentId);
    const keyPair = loadKeyPairFromFile(path.resolve(keyPath));
    if (keyPair.publicKeyHex.startsWith('mock-pubkey')) return null;
    return normalizePublicKeyHex(keyPair.publicKeyHex);
  } catch {
    return null;
  }
}

export function signVotePayload(
  agentId: AgentId,
  rwaId: string,
  vote: string,
  confidence: number,
): AgentSignature {
  const keyPath = getAgentKeyPath(agentId);

  try {
    const keyPair = loadKeyPairFromFile(keyPath);
    const payload = JSON.stringify({ agentId, rwaId, vote, confidence, timestamp: Date.now() });
    const signature = signMessage(payload, keyPair.secretKey);

    return {
      agentId,
      publicKeyHex: keyPair.publicKeyHex,
      accountHash: keyPair.accountHash,
      signature,
      payload,
      keyPath,
    };
  } catch (err) {
    logger.warn('Agent key not found, using mock signature', { agent_id: agentId, rwa_id: rwaId });
    // Return mock signature when keys are not yet generated
    return {
      agentId,
      publicKeyHex: `mock-pubkey-${agentId}`,
      accountHash: `account-hash-mock-${agentId}`,
      signature: `mock-sig-${agentId}-${rwaId}`,
      payload: JSON.stringify({ agentId, rwaId, vote, confidence }),
      keyPath,
    };
  }
}
