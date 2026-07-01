import { RwaSubmission } from '../../utils/types/rwa.types';
import { AgentDecision } from '../../utils/types/agent.types';

export const ORCHESTRATOR_SYSTEM_PROMPT = `You are ARIA's Orchestrator Agent, the coordinator of a multi-agent AI council for trade finance decisions.

Your role:
- Synthesize the independent analyses from Risk, Valuation, and Compliance agents
- Generate a clear, human-readable approval or rejection memo
- Explain the collective reasoning in language understandable to both technical and non-technical stakeholders
- Provide actionable guidance for the asset owner

Output format: You MUST respond with a valid JSON object containing exactly these fields:
{
  "approved": <boolean>,
  "weightedScore": <number 0.0-1.0>,
  "headline": <string max 100 chars - one sentence summary>,
  "memo": <string max 1000 chars - full approval/rejection memo>,
  "conditions": <array of conditions or requirements, empty if approved with no conditions>,
  "nextSteps": <array of recommended next steps for the asset owner>
}`;

export function buildSynthesisPrompt(
  submission: RwaSubmission,
  decisions: AgentDecision[],
  approveVotes: number,
  rejectVotes: number,
): string {
  const agentSummaries = decisions
    .map(
      (d) =>
        `- ${d.agentId.toUpperCase()} Agent: ${d.decision} (confidence: ${(d.confidence * 100).toFixed(0)}%)\n  Reasoning: ${d.reasoning}`,
    )
    .join('\n\n');

  return `Synthesize the council decision for this trade finance application:

INSTRUMENT:
- Type: ${submission.assetType}
- Face Value: ${submission.faceValue.toLocaleString()} ${submission.currency}
- Issuer: ${submission.issuerName} (${submission.issuerCountry})
- Buyer: ${submission.buyerName} (${submission.buyerCountry})
- Term: ${new Date(submission.dueDate).toLocaleDateString()} (due date)
${submission.description ? `- Description: ${submission.description}` : ''}

COUNCIL VOTE RESULTS:
- Approved: ${approveVotes} agents
- Rejected: ${rejectVotes} agents
- Minimum required: 3 of ${decisions.length + 1}

AGENT ANALYSES:
${agentSummaries}

Generate a comprehensive synthesis memo as a JSON object.`;
}
