import { FxRateData } from '../../services/x402/providers/fx-rates';
import { MarketData } from '../../services/x402/providers/market-data';

export interface ValuationAnalysisRaw {
  fairValueUsd?: number;
  netPresentValue?: number;
  discountRate?: number;
  fxAdjustedValue?: number;
  collateralRatio?: number;
  marketConditionScore?: number;
  vote?: 'APPROVE' | 'REJECT';
  confidence?: number;
  reasoning?: string;
}

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

const NPV_APPROVE_THRESHOLD = 0.8;

export function isValuationResponseComplete(
  parsed: Partial<ValuationAnalysisRaw>,
): parsed is ValuationAnalysisRaw & { vote: 'APPROVE' | 'REJECT'; reasoning: string } {
  const vote = parsed.vote;
  const hasVote = vote === 'APPROVE' || vote === 'REJECT';
  const reasoning = typeof parsed.reasoning === 'string' ? parsed.reasoning.trim() : '';
  return hasVote && reasoning.length >= 10;
}

export function normalizeValuationAnalysis(
  raw: Partial<ValuationAnalysisRaw>,
  faceValueUsd: number,
  fxData: FxRateData,
  marketData: MarketData,
): ValuationAnalysis {
  const fairValueUsd = Math.max(0, raw.fairValueUsd ?? faceValueUsd * 0.95);
  const netPresentValue = Math.max(0, raw.netPresentValue ?? faceValueUsd * 0.9);
  const discountRate = Math.max(0, Math.min(0.5, raw.discountRate ?? marketData.discountRate ?? 0.1));
  const fxAdjustedValue = Math.max(0, raw.fxAdjustedValue ?? faceValueUsd);
  const collateralRatio = Math.max(0.5, Math.min(0.95, raw.collateralRatio ?? 0.75));
  const marketConditionScore = Math.max(0, Math.min(1, raw.marketConditionScore ?? 0.8));

  const npvRatio = faceValueUsd > 0 ? netPresentValue / faceValueUsd : 0;
  const voteFromModel = raw.vote === 'APPROVE' || raw.vote === 'REJECT' ? raw.vote : undefined;
  const reasoningFromModel =
    typeof raw.reasoning === 'string' && raw.reasoning.trim().length >= 10
      ? raw.reasoning.trim()
      : undefined;

  let vote: 'APPROVE' | 'REJECT';
  let reasoning: string;
  let confidence: number;

  if (voteFromModel && reasoningFromModel) {
    vote = voteFromModel;
    reasoning = reasoningFromModel.substring(0, 500);
    confidence = clamp01(raw.confidence ?? (vote === 'APPROVE' ? 0.85 : 0.65));
  } else if (voteFromModel) {
    vote = voteFromModel;
    reasoning = `NPV ${(npvRatio * 100).toFixed(1)}% of face ($${netPresentValue.toLocaleString()} / $${faceValueUsd.toLocaleString()}). Vote: ${vote}.`;
    confidence = clamp01(raw.confidence ?? (vote === 'APPROVE' ? 0.8 : 0.6));
  } else {
    const voteFromNpv: 'APPROVE' | 'REJECT' = npvRatio >= NPV_APPROVE_THRESHOLD ? 'APPROVE' : 'REJECT';
    vote = voteFromModel ?? voteFromNpv;
    reasoning =
      reasoningFromModel ??
      `NPV ${(npvRatio * 100).toFixed(1)}% of face value (threshold ${NPV_APPROVE_THRESHOLD * 100}%). ` +
        `FX vol ${(fxData.volatility30d * 100).toFixed(1)}%, market ${marketData.marketCondition}. ` +
        `Vote applied via NPV rule because model output was incomplete.`;
    confidence = clamp01(
      raw.confidence ??
        (vote === 'APPROVE' ? Math.min(0.85, 0.65 + npvRatio * 0.2) : 0.55),
    );
  }

  return {
    fairValueUsd,
    netPresentValue,
    discountRate,
    fxAdjustedValue,
    collateralRatio,
    marketConditionScore,
    vote,
    confidence,
    reasoning,
  };
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
