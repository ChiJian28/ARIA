import { riskAgent } from '../risk';
import { valuationAgent } from '../valuation';
import { complianceAgent } from '../compliance';
import { sseEmitter } from '../../api/sse/emitter';
import { agentRepo } from '../../db/repositories/agent.repo';
import { AgentDecision, AgentId } from '../../utils/types/agent.types';
import { RwaSubmission } from '../../utils/types/rwa.types';
import logger from '../../utils/logger';

function emitAgentFailure(agentId: string, rwaId: string, error: Error): void {
  const message = error.message.includes('503')
    ? 'Gemini API unavailable (503) · defaulting to REJECT'
    : `Analysis failed · ${error.message.slice(0, 72)}`;

  sseEmitter.emit('AGENT_STATUS_UPDATE', {
    type: 'AGENT_STATUS_UPDATE',
    agentId,
    rwaId,
    data: { rwaId, message },
    timestamp: new Date().toISOString(),
  });
}

async function recordFailedAgentVote(
  agentId: AgentId,
  rwaId: string,
  error: Error,
): Promise<AgentDecision> {
  emitAgentFailure(agentId, rwaId, error);

  const reasoning = `Agent error — defaulting to reject: ${error.message.slice(0, 240)}`;

  await agentRepo.saveVote({
    rwaId,
    agentId,
    vote: 'REJECT',
    confidence: 0,
    reasoning,
  });

  sseEmitter.emit('VOTE_CAST', {
    type: 'VOTE_CAST',
    agentId,
    rwaId,
    data: { rwaId, agentId, vote: 'REJECT', confidence: 0 },
    timestamp: new Date().toISOString(),
  });

  return {
    agentId,
    rwaId,
    decision: 'REJECT',
    confidence: 0,
    reasoning,
    processingTimeMs: 0,
  };
}

export async function dispatchSpecialistAgents(
  submission: RwaSubmission,
): Promise<{
  riskDecision: AgentDecision;
  valuationDecision: AgentDecision;
  complianceDecision: AgentDecision;
  errors: string[];
}> {
  const rwaId = submission.id;
  logger.info('Dispatching specialist agents', { rwa_id: rwaId });

  const errors: string[] = [];

  const [riskResult, valuationResult, complianceResult] = await Promise.allSettled([
    riskAgent.run(rwaId, submission),
    valuationAgent.run(rwaId, submission),
    complianceAgent.run(rwaId, submission),
  ]);

  let riskDecision: AgentDecision;
  if (riskResult.status === 'fulfilled') {
    riskDecision = riskResult.value;
  } else {
    errors.push(`Risk agent failed: ${(riskResult.reason as Error).message}`);
    riskDecision = await recordFailedAgentVote('risk', rwaId, riskResult.reason as Error);
  }

  let valuationDecision: AgentDecision;
  if (valuationResult.status === 'fulfilled') {
    valuationDecision = valuationResult.value;
  } else {
    errors.push(`Valuation agent failed: ${(valuationResult.reason as Error).message}`);
    valuationDecision = await recordFailedAgentVote('valuation', rwaId, valuationResult.reason as Error);
  }

  let complianceDecision: AgentDecision;
  if (complianceResult.status === 'fulfilled') {
    complianceDecision = complianceResult.value;
  } else {
    errors.push(`Compliance agent failed: ${(complianceResult.reason as Error).message}`);
    complianceDecision = await recordFailedAgentVote('compliance', rwaId, complianceResult.reason as Error);
  }

  logger.info('Specialist agents completed', {
    rwa_id: rwaId,
    risk: riskDecision.decision,
    valuation: valuationDecision.decision,
    compliance: complianceDecision.decision,
    errors: errors.length,
  });

  return { riskDecision, valuationDecision, complianceDecision, errors };
}
