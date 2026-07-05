export interface HealthResponse {
  status: 'healthy' | 'degraded';
  services: {
    database: 'ok' | 'error';
    redis: 'ok' | 'error';
    casperNode: 'ok' | 'error';
    gemini: 'ok' | 'error';
  };
  latestBlockHeight?: number;
  timestamp: string;
}

export type RwaStatus = 'PENDING' | 'ANALYZING' | 'VOTING' | 'APPROVED' | 'REJECTED' | 'SETTLED' | 'DEFAULTED';
export type AssetType = 'INVOICE' | 'PURCHASE_ORDER' | 'TRADE_RECEIVABLE';

export interface AgentVote {
  agentId: string;
  vote: 'APPROVE' | 'REJECT' | 'PENDING';
  confidence: number;
  reasoning: string;
  txHash: string | null;
  votedAt: string;
}

export interface RwaSummary {
  id: string;
  ownerPublicKey: string;
  assetType: AssetType;
  faceValue: string;
  currency: string;
  status: RwaStatus;
  riskScore: number | null;
  createdAt: string;
  maturityDate: string;
}

export interface RwaDetail extends RwaSummary {
  counterpartyName: string;
  counterpartyJurisdiction: string;
  description: string;
  collateralRatio: number | null;
  /** On-chain CEP-78 token id (u64), when resolved from contract */
  nftTokenId: string | null;
  /** Casper deploy hash of the mint_rwa transaction */
  mintTxHash: string | null;
  finalDecisionMemo?: string;
  votes: AgentVote[];
}

export interface RwaSubmitInput {
  ownerPublicKey: string;
  assetType: AssetType;
  faceValue: string;
  currency: string;
  maturityDate: string;
  counterpartyName: string;
  counterpartyJurisdiction: string;
  description: string;
  documentHash?: string;
}

export interface ParsedInvoiceDocument {
  documentHash: string;
  filename: string;
  counterpartyName: string;
  counterpartyJurisdiction: string;
  faceValue: number;
  currency: string;
  maturityDate: string;
  description?: string;
  invoiceNumber?: string;
  confidence: number;
}

export interface VaultStats {
  tvlMotes: string;
  tvlCspr: string;
  totalLpTokens: string;
  activePositions: number;
  activeCollateral: number;
  currentApy: number;
  totalYieldEarned: string;
}

export interface VaultPosition {
  address: string;
  lpTokens: string;
  csprDeposited: string;
  yieldEarned: string;
  lastUpdated: string;
}

export interface VaultPrepareDepositResponse {
  unsignedDeploy: Record<string, unknown>;
  estimatedLpTokens: string;
  amountMotes: string;
}

export interface VaultPrepareWithdrawResponse {
  unsignedDeploy: Record<string, unknown>;
  estimatedCspr: string;
  lpTokenAmountMotes: string;
}

export interface VaultSubmitResponse {
  deployHash: string;
  /** 'submitted' = accepted by node, awaiting block finality (confirmed via SSE VAULT_EVENT) */
  status: 'submitted' | 'success' | 'failure' | 'pending';
  position?: VaultPosition | null;
}

export interface VaultSubmitInput {
  signedDeploy: Record<string, unknown>;
  address: string;
  operation: 'deposit' | 'withdraw';
  amountMotes?: string;
  lpTokenAmountMotes?: string;
  estimatedLpTokens?: string;
  estimatedCspr?: string;
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

export interface AgentReputation {
  agentId: string;
  reputationScore: number;
  totalVotes: number;
  correctCalls: number;
  nftTokenId: string | null;
}

export interface AgentInfo {
  id: string;
  name: string;
  description: string;
  voteWeight: number;
  reputation: AgentReputation | null;
  status: 'IDLE' | 'BUSY' | 'ERROR' | 'ANALYZING' | 'VOTING';
  agentPublicKey: string | null;
}

export interface LeaderboardEntry {
  rank: number;
  agentId: string;
  name: string;
  reputationScore: number;
  totalVotes: number;
  correctCalls: number;
  accuracy: number;
  nftTokenId: string | null;
  agentPublicKey: string | null;
}

export interface CouncilPendingResponse {
  pending: RwaSummary[];
  inProgress: RwaSummary[];
  totalPending: number;
}

export interface CouncilVotesResponse {
  rwaId: string;
  status: RwaStatus;
  votes: AgentVote[];
  summary: {
    total: number;
    approve: number;
    reject: number;
    consensusReached: boolean;
    approved: boolean;
  };
}

export interface AuditTrailVoteSummary {
  total: number;
  approve: number;
  reject: number;
  councilSize: number;
  minApprove: number;
  consensusReached: boolean;
  label: string;
}

export interface ObservatoryAuditTrailEntry {
  id: string;
  issuerName: string;
  buyerName: string;
  faceValue: number;
  currency: string;
  status: RwaStatus;
  createdAt: string;
  apy: number | null;
  voteSummary: AuditTrailVoteSummary;
}

export type SseEventType =
  | 'CONNECTED'
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
  agentId?: string;
  rwaId?: string;
  payload?: Record<string, unknown>;
  data?: Record<string, unknown>;
  timestamp: string;
  clientId?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  count?: number;
  message?: string;
}
