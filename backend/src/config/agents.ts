import { config } from './index';

export type AgentId = 'orchestrator' | 'risk' | 'valuation' | 'compliance' | 'sentinel';

export interface AgentConfig {
  id: AgentId;
  name: string;
  keyPath: string;
  voteWeight: number;
  description: string;
}

export function getAgentConfigs(): AgentConfig[] {
  return [
    {
      id: 'risk',
      name: 'Risk Agent',
      keyPath: config.RISK_AGENT_KEY_PATH,
      voteWeight: config.RISK_AGENT_WEIGHT,
      description: 'Evaluates creditworthiness and probability of default',
    },
    {
      id: 'valuation',
      name: 'Valuation Agent',
      keyPath: config.VALUATION_AGENT_KEY_PATH,
      voteWeight: config.VALUATION_AGENT_WEIGHT,
      description: 'Determines fair value, NPV, and collateral ratio',
    },
    {
      id: 'compliance',
      name: 'Compliance Agent',
      keyPath: config.COMPLIANCE_AGENT_KEY_PATH,
      voteWeight: config.COMPLIANCE_AGENT_WEIGHT,
      description: 'Checks KYC/AML status and jurisdiction eligibility',
    },
    {
      id: 'sentinel',
      name: 'Sentinel Agent',
      keyPath: config.SENTINEL_AGENT_KEY_PATH,
      voteWeight: 0,
      description: 'Continuously monitors active positions for risk signals',
    },
    {
      id: 'orchestrator',
      name: 'Orchestrator Agent',
      keyPath: config.ORCHESTRATOR_KEY_PATH,
      voteWeight: 0,
      description: 'Coordinates agent pipeline and synthesizes final decision',
    },
  ];
}

export const APPROVAL_THRESHOLDS = {
  INVOICE: { minVotes: 3, minWeightedScore: 0.6 },
  PURCHASE_ORDER: { minVotes: 3, minWeightedScore: 0.65 },
  TRADE_RECEIVABLE: { minVotes: 4, minWeightedScore: 0.7 },
} as const;

export const COUNCIL_MIN_VOTES = () => config.COUNCIL_MIN_VOTES;
