import { BaseAgent } from '../base/agent';
import { AgentDecision } from '../../utils/types/agent.types';
import { RwaSubmission } from '../../utils/types/rwa.types';
import { fetchRiskData } from './x402-caller';
import { analyzeRisk } from './analyzer';
import { getTotalSpend } from '../../services/x402/wallet';

export class RiskAgent extends BaseAgent {
  constructor() {
    super('risk');
  }

  async run(rwaId: string, submission: RwaSubmission): Promise<AgentDecision> {
    const startMs = Date.now();
    this.setState('ANALYZING', rwaId);
    this.emitEvent('AGENT_STARTED', { rwaId, stage: 'credit_data_fetch' });
    this.emitStatusUpdate(rwaId, 'Initializing credit risk pipeline…');
    this.emitStatusUpdate(rwaId, 'Paying x402 micropayment · credit bureau API…');

    this.logger.info('Starting risk analysis', { rwa_id: rwaId });

    // Step 1: Fetch credit data via x402 paid calls
    const { issuerCredit, buyerCredit } = await fetchRiskData(submission);
    this.emitStatusUpdate(rwaId, 'Credit data received · issuer & buyer profiles loaded');

    this.emitEvent('AGENT_STARTED', { rwaId, stage: 'llm_analysis' });
    this.emitStatusUpdate(rwaId, 'Running Gemini inference on probability-of-default…');

    // Step 2: Analyze with Gemini
    const analysis = await analyzeRisk(submission, issuerCredit, buyerCredit);
    this.emitStatusUpdate(rwaId, `Risk score computed · PD ${(analysis.probabilityOfDefault * 100).toFixed(1)}%`);

    this.setState('VOTING', rwaId);
    this.emitStatusUpdate(rwaId, 'Signing & broadcasting on-chain vote…');

    // Step 3: Cast on-chain vote and persist
    const spentMotes = getTotalSpend(rwaId);
    await this.vote(
      rwaId,
      analysis.vote,
      analysis.confidence,
      analysis.reasoning,
      {
        probabilityOfDefault: analysis.probabilityOfDefault,
        creditScore: analysis.creditScore,
        suggestedRate: analysis.suggestedRate,
        riskTier: analysis.riskTier,
        flags: analysis.flags,
        issuerCredit,
        buyerCredit,
      },
      spentMotes,
    );

    this.setState('IDLE');
    this.emitEvent('AGENT_COMPLETED', {
      rwaId,
      vote: analysis.vote,
      confidence: analysis.confidence,
    });

    const processingTimeMs = Date.now() - startMs;
    this.logger.info('Risk analysis complete', {
      rwa_id: rwaId,
      vote: analysis.vote,
      pd: analysis.probabilityOfDefault,
      processingTimeMs,
    });

    return {
      agentId: 'risk',
      rwaId,
      decision: analysis.vote,
      confidence: analysis.confidence,
      reasoning: analysis.reasoning,
      processingTimeMs,
    };
  }
}

export const riskAgent = new RiskAgent();
