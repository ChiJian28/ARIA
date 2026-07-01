import { generateJson } from '../../services/gemini/client';
import { VALUATION_AGENT_SYSTEM_PROMPT, buildValuationPrompt } from './prompts';
import { RwaSubmission } from '../../utils/types/rwa.types';
import { FxRateData } from '../../services/x402/providers/fx-rates';
import { MarketData } from '../../services/x402/providers/market-data';

export interface ValuationAnalysis {
  fairValueUsd: number;
  netPresentValue: number;
  discountRate: number;
  fxAdjustedValue: number;
  collateralRatio: number;
  marketConditionScore: number;
  vote: 'APPROVE' | 'REJECT';
  confidence: number;
  reasoning: string;
}

export async function analyzeValuation(
  submission: RwaSubmission,
  fxData: FxRateData,
  marketData: MarketData,
): Promise<ValuationAnalysis> {
  const prompt = buildValuationPrompt(submission, fxData, marketData);

  const analysis = await generateJson<ValuationAnalysis>(
    VALUATION_AGENT_SYSTEM_PROMPT,
    prompt,
    { agent_id: 'valuation', rwa_id: submission.id },
  );

  const faceValueUsd = submission.faceValue * fxData.spotRate;

  return {
    fairValueUsd: Math.max(0, analysis.fairValueUsd ?? faceValueUsd * 0.95),
    netPresentValue: Math.max(0, analysis.netPresentValue ?? faceValueUsd * 0.9),
    discountRate: Math.max(0, Math.min(0.5, analysis.discountRate ?? 0.1)),
    fxAdjustedValue: Math.max(0, analysis.fxAdjustedValue ?? faceValueUsd),
    collateralRatio: Math.max(0.5, Math.min(0.95, analysis.collateralRatio ?? 0.75)),
    marketConditionScore: Math.max(0, Math.min(1, analysis.marketConditionScore ?? 0.8)),
    vote: analysis.vote === 'APPROVE' ? 'APPROVE' : 'REJECT',
    confidence: Math.max(
      0,
      Math.min(1, analysis.confidence ?? (analysis.vote === 'APPROVE' ? 0.85 : 0.5)),
    ),
    reasoning: String(
      analysis.reasoning ?? 'Valuation analysis completed from recovered model output.',
    ).substring(0, 500),
  };
}
