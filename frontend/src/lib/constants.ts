export const EXPLORER_URL = 'https://testnet.cspr.live';
export const CHAIN_NAME = process.env.NEXT_PUBLIC_CHAIN_NAME ?? 'casper-test';
export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/** Agents in Observatory Meritocracy + Landing council showcase (same order). */
export const COUNCIL_MERIT_AGENT_IDS = ['risk', 'compliance', 'valuation', 'sentinel'] as const;
export type CouncilMeritAgentId = (typeof COUNCIL_MERIT_AGENT_IDS)[number];

export const AGENT_IDS = ['risk', 'valuation', 'compliance'] as const;
export type AgentId = (typeof AGENT_IDS)[number];

/** Agents shown in the submit-flow council theater (3 voters + orchestrator). */
export const COUNCIL_THEATER_AGENT_IDS = ['risk', 'valuation', 'compliance', 'orchestrator'] as const;
export const COUNCIL_VOTING_AGENT_IDS = AGENT_IDS;
export const COUNCIL_VOTING_COUNT = COUNCIL_VOTING_AGENT_IDS.length;
export const COUNCIL_MIN_APPROVE = 3;
export const COUNCIL_MIN_REJECT = 2;

export const AGENT_LABELS: Record<string, string> = {
  risk: 'Risk',
  valuation: 'Valuation',
  compliance: 'Compliance',
  orchestrator: 'Orchestrator',
  sentinel: 'Sentinel',
};

export const ASSET_TYPES = [
  { value: 'INVOICE', label: 'Invoice', icon: '📄' },
  { value: 'PURCHASE_ORDER', label: 'Purchase Order', icon: '📦' },
  { value: 'TRADE_RECEIVABLE', label: 'Trade Receivable', icon: '💱' },
] as const;

export const RWA_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  ANALYZING: 'Analyzing',
  VOTING: 'Voting',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  ACTIVE: 'Active',
  MATURED: 'Matured',
  SETTLED: 'Settled',
  DEFAULTED: 'Defaulted',
};

export const STATUS_COLORS: Record<string, string> = {
  PENDING: 'amber',
  ANALYZING: 'sky',
  VOTING: 'violet',
  APPROVED: 'emerald',
  REJECTED: 'red',
  ACTIVE: 'emerald',
  MATURED: 'amber',
  SETTLED: 'teal',
  DEFAULTED: 'red',
};
