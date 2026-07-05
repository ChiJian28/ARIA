import type {
  ApiResponse,
  HealthResponse,
  RwaDetail,
  RwaSummary,
  RwaSubmitInput,
  ParsedInvoiceDocument,
  VaultStats,
  VaultPosition,
  VaultPrepareDepositResponse,
  VaultPrepareWithdrawResponse,
  VaultSubmitResponse,
  VaultSubmitInput,
  VaultInstrumentResponse,
  VaultRiskDistributionResponse,
  AgentInfo,
  AgentReputation,
  LeaderboardEntry,
  CouncilPendingResponse,
  CouncilVotesResponse,
  ObservatoryAuditTrailEntry,
  AgentVote,
} from '@/types/api.types';
import { mapRwaDetail, mapRwaSummary, toBackendSubmitPayload } from '@/lib/rwa-mapper';

const BASE = '/api/proxy';

function formatApiError(payload: { error?: string; details?: unknown }): string {
  if (!payload.details || !Array.isArray(payload.details)) {
    return payload.error ?? 'Request failed';
  }

  const detailMessages = payload.details
    .map((detail) => {
      if (typeof detail !== 'object' || detail === null) return null;
      const item = detail as { path?: unknown[]; message?: string };
      if (!item.message) return null;
      const path = Array.isArray(item.path) && item.path.length > 0 ? `${item.path.join('.')}: ` : '';
      return `${path}${item.message}`;
    })
    .filter(Boolean);

  if (detailMessages.length === 0) return payload.error ?? 'Request failed';
  return detailMessages.slice(0, 2).join('; ');
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });
  const json = await res.json().catch(() => ({ error: res.statusText }));
  if (!res.ok) {
    throw new Error(formatApiError(json));
  }
  const response = json as ApiResponse<T>;
  return response.data;
}

// Health
export const fetchHealth = () => apiFetch<HealthResponse>('/health');

// RWA
export const fetchRwa = async (id: string) => {
  const raw = await apiFetch<RwaDetail>(`/rwa/${id}`);
  return mapRwaDetail(raw);
};
export const fetchRwaVotes = (id: string) => apiFetch<AgentVote[]>(`/rwa/${id}/votes`);
export const fetchRwas = async (params?: { owner?: string; limit?: number; offset?: number }) => {
  const qs = new URLSearchParams();
  if (params?.owner) qs.set('owner', params.owner);
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.offset) qs.set('offset', String(params.offset));
  const raw = await apiFetch<RwaSummary[]>(`/rwa${qs.toString() ? `?${qs}` : ''}`);
  return raw.map(mapRwaSummary);
};
export const submitRwa = (body: RwaSubmitInput) =>
  apiFetch<{ id: string; status: string; message: string }>('/rwa/submit', {
    method: 'POST',
    body: JSON.stringify(toBackendSubmitPayload(body)),
  });

export async function parseInvoiceDocument(file: File): Promise<ParsedInvoiceDocument> {
  const form = new FormData();
  form.append('file', file);

  const res = await fetch(`${BASE}/rwa/parse-document`, {
    method: 'POST',
    body: form,
  });
  const json = await res.json().catch(() => ({ error: res.statusText }));
  if (!res.ok) {
    throw new Error(formatApiError(json));
  }
  return (json as ApiResponse<ParsedInvoiceDocument>).data;
}

// Vault
export const fetchVaultStats = () => apiFetch<VaultStats>('/vault/stats');
export const fetchVaultInstruments = () => apiFetch<VaultInstrumentResponse[]>('/vault/instruments');
export const fetchVaultRiskDistribution = () => apiFetch<VaultRiskDistributionResponse>('/vault/risk-distribution');
export const fetchVaultPosition = (address: string) =>
  apiFetch<VaultPosition | null>(`/vault/positions/${address}`);

export const prepareVaultDeposit = (address: string, amountMotes: string) =>
  apiFetch<VaultPrepareDepositResponse>('/vault/deposit', {
    method: 'POST',
    body: JSON.stringify({ address, amountMotes }),
  });

export const prepareVaultWithdraw = (address: string, lpTokenAmountMotes: string) =>
  apiFetch<VaultPrepareWithdrawResponse>('/vault/withdraw', {
    method: 'POST',
    body: JSON.stringify({ address, lpTokenAmountMotes }),
  });

export const submitVaultTransaction = (body: VaultSubmitInput) =>
  apiFetch<VaultSubmitResponse>('/vault/submit', {
    method: 'POST',
    body: JSON.stringify(body),
  });

/** @deprecated Use prepareVaultDeposit + submitVaultTransaction for on-chain flow */
export const depositVault = (address: string, amountMotes: string) =>
  prepareVaultDeposit(address, amountMotes);

/** @deprecated Use prepareVaultWithdraw + submitVaultTransaction for on-chain flow */
export const withdrawVault = (address: string, lpTokenAmountMotes: string) =>
  prepareVaultWithdraw(address, lpTokenAmountMotes);

// Agents
export const fetchAgents = () => apiFetch<AgentInfo[]>('/agents');
export const fetchAgentReputation = (id: string) => apiFetch<AgentReputation>(`/agents/${id}/reputation`);
export const fetchAgentHistory = (id: string, limit = 20) =>
  apiFetch<AgentVote[]>(`/agents/${id}/history?limit=${limit}`);
export const fetchLeaderboard = () => apiFetch<LeaderboardEntry[]>('/agents/leaderboard');

// Observatory
export const fetchObservatoryAuditTrail = (params?: { limit?: number; offset?: number }) => {
  const qs = new URLSearchParams();
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.offset) qs.set('offset', String(params.offset));
  const query = qs.toString();
  return apiFetch<ObservatoryAuditTrailEntry[]>(`/observatory/audit-trail${query ? `?${query}` : ''}`);
};

// Council
export const fetchCouncilPending = () => apiFetch<CouncilPendingResponse>('/council/pending');
export const fetchCouncilVotes = (rwaId: string) => apiFetch<CouncilVotesResponse>(`/council/votes/${rwaId}`);
