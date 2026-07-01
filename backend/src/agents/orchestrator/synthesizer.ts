import { generateJson } from '../../services/gemini/client';
import { ORCHESTRATOR_SYSTEM_PROMPT, buildSynthesisPrompt } from './prompts';
import { AgentDecision } from '../../utils/types/agent.types';
import { RwaSubmission } from '../../utils/types/rwa.types';
import { config } from '../../config';

export interface SynthesisResult {
  approved: boolean;
  weightedScore: number;
  headline: string;
  memo: string;
  conditions: string[];
  nextSteps: string[];
}

function calculateWeightedScore(decisions: AgentDecision[]): number {
  const weights: Record<string, number> = {
    risk: config.RISK_AGENT_WEIGHT / 100,
    valuation: config.VALUATION_AGENT_WEIGHT / 100,
    compliance: config.COMPLIANCE_AGENT_WEIGHT / 100,
  };

  let weightedSum = 0;
  let totalWeight = 0;

  for (const d of decisions) {
    const weight = weights[d.agentId] ?? 0.33;
    const score = d.decision === 'APPROVE' ? d.confidence : 1 - d.confidence;
    weightedSum += score * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

export async function synthesizeDecision(
  submission: RwaSubmission,
  decisions: AgentDecision[],
): Promise<SynthesisResult> {
  const approveVotes = decisions.filter((d) => d.decision === 'APPROVE').length;
  const rejectVotes = decisions.filter((d) => d.decision === 'REJECT').length;
  const weightedScore = calculateWeightedScore(decisions);
  const meetsConsensus = approveVotes >= config.COUNCIL_MIN_VOTES;

  const prompt = buildSynthesisPrompt(submission, decisions, approveVotes, rejectVotes);

  const synthesis = await generateJson<SynthesisResult>(
    ORCHESTRATOR_SYSTEM_PROMPT,
    prompt,
    { agent_id: 'orchestrator', rwa_id: submission.id },
  );

  return {
    approved: meetsConsensus && synthesis.approved,
    weightedScore,
    headline: String(synthesis.headline ?? '').substring(0, 100),
    memo: String(synthesis.memo ?? '').substring(0, 1000),
    conditions: Array.isArray(synthesis.conditions) ? synthesis.conditions : [],
    nextSteps: Array.isArray(synthesis.nextSteps) ? synthesis.nextSteps : [],
  };
}
