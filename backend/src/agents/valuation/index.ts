import { BaseAgent } from '../base/agent';
import { AgentDecision } from '../../utils/types/agent.types';
import { RwaSubmission } from '../../utils/types/rwa.types';
import { fetchValuationData } from './x402-caller';
import { analyzeValuation } from './analyzer';
import { getTotalSpend } from '../../services/x402/wallet';

export class ValuationAgent extends BaseAgent {
  constructor() {
    super('valuation');
  }

  async run(rwaId: string, submission: RwaSubmission): Promise<AgentDecision> {
    const startMs = Date.now();
    this.setState('ANALYZING', rwaId);
    this.emitEvent('AGENT_STARTED', { rwaId, stage: 'market_data_fetch' });
    this.emitStatusUpdate(rwaId, 'Initializing valuation engine…');
    this.emitStatusUpdate(rwaId, 'Paying x402 micropayment · FX rate provider…');

    this.logger.info('Starting valuation analysis', { rwa_id: rwaId });

    // Step 1: Fetch FX rates and market data via x402
    const { fxData, marketData } = await fetchValuationData(submission);
    this.emitStatusUpdate(rwaId, 'Paying x402 micropayment · market benchmark API…');
    this.emitStatusUpdate(rwaId, 'Market data synced · computing NPV…');

    this.emitEvent('AGENT_STARTED', { rwaId, stage: 'llm_analysis' });
    this.emitStatusUpdate(rwaId, 'Running Gemini inference on fair value & collateral ratio…');

    // Step 2: Analyze with Gemini
    const analysis = await analyzeValuation(submission, fxData, marketData);
    this.emitStatusUpdate(rwaId, `NPV ${analysis.netPresentValue.toLocaleString()} USD · collateral ${(analysis.collateralRatio * 100).toFixed(0)}%`);

    this.setState('VOTING', rwaId);
    this.emitStatusUpdate(rwaId, 'Signing & broadcasting on-chain vote…');

    // Step 3: Cast vote
    const spentMotes = getTotalSpend(rwaId);
    await this.vote(
      rwaId,
      analysis.vote,
      analysis.confidence,
      analysis.reasoning,
      {
        fairValueUsd: analysis.fairValueUsd,
        netPresentValue: analysis.netPresentValue,
        collateralRatio: analysis.collateralRatio,
        discountRate: analysis.discountRate,
        fxData,
        marketData,
      },
      spentMotes,
    );

    this.setState('IDLE');
    this.emitEvent('AGENT_COMPLETED', {
      rwaId,
      vote: analysis.vote,
      confidence: analysis.confidence,
      npv: analysis.netPresentValue,
    });

    const processingTimeMs = Date.now() - startMs;
    this.logger.info('Valuation analysis complete', {
      rwa_id: rwaId,
      vote: analysis.vote,
      npv: analysis.netPresentValue,
      collateralRatio: analysis.collateralRatio,
      processingTimeMs,
    });

    return {
      agentId: 'valuation',
      rwaId,
      decision: analysis.vote,
      confidence: analysis.confidence,
      reasoning: analysis.reasoning,
      processingTimeMs,
    };
  }
}

export const valuationAgent = new ValuationAgent();
