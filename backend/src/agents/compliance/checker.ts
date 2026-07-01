import { generateJson } from '../../services/gemini/client';
import { COMPLIANCE_AGENT_SYSTEM_PROMPT, buildCompliancePrompt } from './prompts';
import { RwaSubmission } from '../../utils/types/rwa.types';
import { KycData } from '../../services/x402/providers/kyc';

export interface ComplianceAnalysis {
  clearanceStatus: 'CLEAR' | 'FLAGGED' | 'REJECTED';
  kycVerified: boolean;
  amlClear: boolean;
  jurisdictionEligible: boolean;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  vote: 'APPROVE' | 'REJECT';
  confidence: number;
  reasoning: string;
  jurisdictionFlags: string[];
  requiredActions: string[];
}

export async function checkCompliance(
  submission: RwaSubmission,
  issuerKyc: KycData,
  buyerKyc: KycData,
): Promise<ComplianceAnalysis> {
  // Hard-reject: sanctions check fails immediately without LLM call
  if (issuerKyc.sanctionsCheck || buyerKyc.sanctionsCheck) {
    return {
      clearanceStatus: 'REJECTED',
      kycVerified: false,
      amlClear: false,
      jurisdictionEligible: false,
      riskLevel: 'HIGH',
      vote: 'REJECT',
      confidence: 1.0,
      reasoning: 'REJECTED: Entity found on sanctions list. Automatic rejection per compliance policy.',
      jurisdictionFlags: ['SANCTIONS_MATCH'],
      requiredActions: [],
    };
  }

  const prompt = buildCompliancePrompt(submission, issuerKyc, buyerKyc);

  const analysis = await generateJson<ComplianceAnalysis>(
    COMPLIANCE_AGENT_SYSTEM_PROMPT,
    prompt,
    { agent_id: 'compliance', rwa_id: submission.id },
  );

  return {
    clearanceStatus: ['CLEAR', 'FLAGGED', 'REJECTED'].includes(analysis.clearanceStatus)
      ? analysis.clearanceStatus
      : 'FLAGGED',
    kycVerified: Boolean(analysis.kycVerified),
    amlClear: Boolean(analysis.amlClear),
    jurisdictionEligible: Boolean(analysis.jurisdictionEligible),
    riskLevel: ['LOW', 'MEDIUM', 'HIGH'].includes(analysis.riskLevel) ? analysis.riskLevel : 'MEDIUM',
    vote: analysis.vote === 'APPROVE' ? 'APPROVE' : 'REJECT',
    confidence: Math.max(
      0,
      Math.min(1, analysis.confidence ?? (analysis.vote === 'APPROVE' ? 0.9 : 0.5)),
    ),
    reasoning: String(analysis.reasoning ?? 'Compliance check completed.').substring(0, 500),
    jurisdictionFlags: Array.isArray(analysis.jurisdictionFlags) ? analysis.jurisdictionFlags : [],
    requiredActions: Array.isArray(analysis.requiredActions) ? analysis.requiredActions : [],
  };
}
