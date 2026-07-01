import { BaseAgent } from '../base/agent';
import { AgentDecision } from '../../utils/types/agent.types';
import { RwaSubmission } from '../../utils/types/rwa.types';
import { fetchComplianceData } from './x402-caller';
import { checkCompliance } from './checker';
import { getTotalSpend } from '../../services/x402/wallet';

export class ComplianceAgent extends BaseAgent {
  constructor() {
    super('compliance');
  }

  async run(rwaId: string, submission: RwaSubmission): Promise<AgentDecision> {
    const startMs = Date.now();
    this.setState('ANALYZING', rwaId);
    this.emitEvent('AGENT_STARTED', { rwaId, stage: 'kyc_data_fetch' });
    this.emitStatusUpdate(rwaId, 'Initializing compliance check…');
    this.emitStatusUpdate(rwaId, 'Paying x402 micropayment · KYC/AML provider…');

    this.logger.info('Starting compliance check', { rwa_id: rwaId });

    // Step 1: Fetch KYC/AML data via x402
    const { issuerKyc, buyerKyc } = await fetchComplianceData(submission);
    this.emitStatusUpdate(rwaId, 'KYC records fetched · screening PEP & sanctions lists…');

    this.emitEvent('AGENT_STARTED', { rwaId, stage: 'llm_analysis' });
    this.emitStatusUpdate(rwaId, 'Running Gemini inference on jurisdiction eligibility…');

    // Step 2: Analyze with Gemini (or hard-reject for sanctions)
    const analysis = await checkCompliance(submission, issuerKyc, buyerKyc);
    this.emitStatusUpdate(rwaId, `Clearance: ${analysis.clearanceStatus} · risk ${analysis.riskLevel}`);

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
        clearanceStatus: analysis.clearanceStatus,
        kycVerified: analysis.kycVerified,
        amlClear: analysis.amlClear,
        jurisdictionEligible: analysis.jurisdictionEligible,
        riskLevel: analysis.riskLevel,
        jurisdictionFlags: analysis.jurisdictionFlags,
        issuerKyc,
        buyerKyc,
      },
      spentMotes,
    );

    this.setState('IDLE');
    this.emitEvent('AGENT_COMPLETED', {
      rwaId,
      vote: analysis.vote,
      clearanceStatus: analysis.clearanceStatus,
      confidence: analysis.confidence,
    });

    const processingTimeMs = Date.now() - startMs;
    this.logger.info('Compliance check complete', {
      rwa_id: rwaId,
      vote: analysis.vote,
      clearance: analysis.clearanceStatus,
      processingTimeMs,
    });

    return {
      agentId: 'compliance',
      rwaId,
      decision: analysis.vote,
      confidence: analysis.confidence,
      reasoning: analysis.reasoning,
      processingTimeMs,
    };
  }
}

export const complianceAgent = new ComplianceAgent();
