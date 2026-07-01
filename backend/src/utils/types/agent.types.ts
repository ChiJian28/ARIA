export type AgentId = 'orchestrator' | 'risk' | 'valuation' | 'compliance' | 'sentinel';

export type VoteDecision = 'APPROVE' | 'REJECT' | 'ABSTAIN';

export interface VotePayload {
  rwaId: string;
  agentId: AgentId;
  vote: VoteDecision;
  confidence: number;
  reasoning: string;
  timestamp: number;
  signature?: string;
}

export interface OnChainVote {
  rwaId: string;
  agentId: AgentId;
  vote: VoteDecision;
  txHash: string;
  blockHash?: string;
  votedAt: Date;
}

export interface ReputationScore {
  agentId: AgentId;
  totalVotes: number;
  correctCalls: number;
  score: number; // 0-100
  nftTokenId?: string;
  lastUpdated: Date;
}

export interface AgentDecision {
  agentId: AgentId;
  rwaId: string;
  decision: VoteDecision;
  confidence: number;
  reasoning: string;
  onChainTxHash?: string;
  processingTimeMs: number;
}

export interface AgentState {
  agentId: AgentId;
  status: 'IDLE' | 'ANALYZING' | 'VOTING' | 'ERROR';
  currentRwaId?: string;
  lastActivity: Date;
  errorMessage?: string;
}

export interface SentinelAlert {
  positionId: string;
  rwaId: string;
  alertType: 'RISK_SPIKE' | 'COUNTERPARTY_DISTRESS' | 'LATE_PAYMENT' | 'MARKET_DETERIORATION';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskDelta: number;
  description: string;
  recommendedAction: 'MONITOR' | 'PARTIAL_LIQUIDATION' | 'FULL_LIQUIDATION';
  detectedAt: Date;
}
