export type AssetClass = 'INVOICE' | 'PURCHASE_ORDER' | 'TRADE_RECEIVABLE';

export type RwaStatus =
  | 'PENDING'       // Submitted, awaiting agent analysis
  | 'ANALYZING'     // Agents are running analysis
  | 'VOTING'        // Agents are casting votes on-chain
  | 'APPROVED'      // 3-of-4 agents approved; NFT minted
  | 'REJECTED'      // Failed to reach consensus
  | 'ACTIVE'        // NFT minted and used as collateral
  | 'MATURED'       // Instrument reached maturity
  | 'DEFAULTED'     // Issuer defaulted; liquidation triggered
  | 'SETTLED';      // Fully repaid and settled

export interface RwaSubmission {
  id: string;
  ownerPublicKey: string;
  assetType: AssetClass;
  faceValue: number;
  currency: string;
  invoiceNumber?: string;
  issuerName: string;
  issuerCountry: string;
  issuerRegistrationNumber: string;
  buyerName: string;
  buyerCountry: string;
  buyerRegistrationNumber?: string;
  issueDate: Date;
  dueDate: Date;
  description?: string;
  documentHash?: string;
  status: RwaStatus;
  nftTokenId?: string;
  mintTxHash?: string;
  collateralLockedMotes?: string;
  lockTxHash?: string;
  riskScore?: number;
  valuationNpv?: number;
  collateralRatio?: number;
  complianceClearance?: 'CLEAR' | 'FLAGGED' | 'REJECTED';
  finalDecisionMemo?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentReport {
  agentId: string;
  rwaId: string;
  reportType: 'RISK' | 'VALUATION' | 'COMPLIANCE';
  vote: 'APPROVE' | 'REJECT' | 'ABSTAIN';
  confidence: number; // 0-1
  reasoning: string;
  rawData?: Record<string, unknown>;
  processingCostMotes?: string;
  createdAt: Date;
}

export interface RiskReport extends AgentReport {
  reportType: 'RISK';
  probabilityOfDefault: number;
  suggestedRate: number;
  creditScore?: number;
  delinquencyFlags: string[];
}

export interface ValuationReport extends AgentReport {
  reportType: 'VALUATION';
  fairValue: number;
  netPresentValue: number;
  collateralRatio: number;
  discountRate: number;
  fxRate?: number;
}

export interface ComplianceReport extends AgentReport {
  reportType: 'COMPLIANCE';
  clearanceStatus: 'CLEAR' | 'FLAGGED' | 'REJECTED';
  jurisdictionFlags: string[];
  pepSanctionsCheck: boolean;
  kycVerified: boolean;
}

export interface OrchestratorDecision {
  rwaId: string;
  approved: boolean;
  weightedScore: number;
  finalMemo: string;
  riskReport: RiskReport;
  valuationReport: ValuationReport;
  complianceReport: ComplianceReport;
  totalProcessingCostMotes: string;
  decidedAt: Date;
}
