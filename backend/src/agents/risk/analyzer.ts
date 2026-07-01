import { generateJson } from '../../services/gemini/client';
import { RISK_AGENT_SYSTEM_PROMPT, buildRiskPrompt } from './prompts';
import { RwaSubmission } from '../../utils/types/rwa.types';
import { CreditData } from '../../services/x402/providers/credit';

export interface RiskAnalysis {
  probabilityOfDefault: number;
  creditScore: number;
  suggestedRate: number;
  riskTier: 'A' | 'B' | 'C' | 'D';
  vote: 'APPROVE' | 'REJECT';
  confidence: number;
  reasoning: string;
  flags: string[];
}

export async function analyzeRisk(
  submission: RwaSubmission,
  issuerCredit: CreditData,
  buyerCredit: CreditData,
): Promise<RiskAnalysis> {
  const prompt = buildRiskPrompt(submission, issuerCredit);

  const analysis = await generateJson<RiskAnalysis>(
    RISK_AGENT_SYSTEM_PROMPT,
    prompt,
    { agent_id: 'risk', rwa_id: submission.id },
  );

  // Validate and clamp output values
  return {
    probabilityOfDefault: Math.max(0, Math.min(1, analysis.probabilityOfDefault)),
    creditScore: Math.max(300, Math.min(850, analysis.creditScore)),
    suggestedRate: Math.max(0, Math.min(0.5, analysis.suggestedRate)),
    riskTier: ['A', 'B', 'C', 'D'].includes(analysis.riskTier) ? analysis.riskTier : 'C',
    vote: analysis.vote === 'APPROVE' ? 'APPROVE' : 'REJECT',
    confidence: Math.max(
      0,
      Math.min(1, analysis.confidence ?? (analysis.vote === 'APPROVE' ? 0.8 : 0.5)),
    ),
    reasoning: String(analysis.reasoning ?? 'Risk analysis completed.').substring(0, 500),
    flags: Array.isArray(analysis.flags) ? analysis.flags : [],
  };
}
