import { RwaStatus, AssetClass } from './rwa.types';
import { AgentId, VoteDecision } from './agent.types';

// ---- Request types ----

export interface SubmitRwaRequest {
  assetType: AssetClass;
  ownerPublicKey: string;
  faceValue: number;
  currency: string;
  invoiceNumber?: string;
  issuerName: string;
  issuerCountry: string;
  issuerRegistrationNumber: string;
  buyerName: string;
  buyerCountry: string;
  buyerRegistrationNumber?: string;
  issueDate: string;
  dueDate: string;
  description?: string;
  documentHash?: string;
}

export interface VaultDepositRequest {
  depositorPublicKey: string;
  amountMotes: string;
  signature: string;
}

// ---- Response types ----

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface RwaResponse {
  id: string;
  status: RwaStatus;
  assetType: AssetClass;
  faceValue: number;
  currency: string;
  issuerName: string;
  buyerName: string;
  issueDate: string;
  dueDate: string;
  nftTokenId?: string;
  riskScore?: number;
  valuationNpv?: number;
  complianceClearance?: string;
  finalDecisionMemo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentVoteResponse {
  id: string;
  rwaId: string;
  agentId: AgentId;
  vote: VoteDecision;
  confidence: number;
  reasoning: string;
  txHash?: string;
  votedAt: string;
}

export interface AgentReputationResponse {
  agentId: AgentId;
  name: string;
  totalVotes: number;
  correctCalls: number;
  reputationScore: number;
  nftTokenId?: string;
  description: string;
}

export interface VaultStatsResponse {
  tvlMotes: string;
  tvlCspr: string;
  totalLpTokens: string;
  activePositions: number;
  currentApy: number;
  activeCollateral: number;
  lockedCsprMotes: string;
  lockedCspr: string;
  utilizationPct: number;
}

export interface VaultInstrumentResponse {
  id: string;
  issuerName: string;
  buyerName: string;
  faceValue: number;
  currency: string;
  maturityDate: string;
  nftTokenId: string | null;
  assetApy: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  claimsStatus: string;
  status: string;
}

export interface VaultRiskDistributionResponse {
  low: number;
  medium: number;
  high: number;
  instrumentCount: number;
}

export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    database: 'ok' | 'error';
    redis: 'ok' | 'error';
    casperNode: 'ok' | 'error';
    gemini: 'ok' | 'error';
  };
  latestBlockHeight?: number;
  timestamp: string;
}

// ---- SSE event types ----

export type SseEventType =
  | 'AGENT_STARTED'
  | 'AGENT_STATUS_UPDATE'
  | 'AGENT_COMPLETED'
  | 'VOTE_CAST'
  | 'CONSENSUS_REACHED'
  | 'NFT_MINTED'
  | 'PIPELINE_STATUS'
  | 'SENTINEL_ALERT'
  | 'VAULT_EVENT'
  | 'CHAIN_EVENT';

export interface SseEvent {
  type: SseEventType;
  rwaId?: string;
  agentId?: AgentId;
  data: Record<string, unknown>;
  timestamp: string;
}
