import { generateJson } from '../../services/gemini/client';
import { VALUATION_AGENT_SYSTEM_PROMPT, buildValuationPrompt } from './prompts';
import { RwaSubmission } from '../../utils/types/rwa.types';
import { FxRateData } from '../../services/x402/providers/fx-rates';
import { MarketData } from '../../services/x402/providers/market-data';
import {
  isValuationResponseComplete,
  normalizeValuationAnalysis,
  ValuationAnalysis,
  ValuationAnalysisRaw,
} from './normalize';
import logger from '../../utils/logger';

export type { ValuationAnalysis };

export async function analyzeValuation(
  submission: RwaSubmission,
  fxData: FxRateData,
  marketData: MarketData,
): Promise<ValuationAnalysis> {
  const faceValueUsd = submission.faceValue * fxData.spotRate;
  const prompt = buildValuationPrompt(submission, fxData, marketData);

  const raw = await generateJson<ValuationAnalysisRaw>(
    VALUATION_AGENT_SYSTEM_PROMPT,
    prompt,
    { agent_id: 'valuation', rwa_id: submission.id },
    { validate: isValuationResponseComplete },
  );

  const result = normalizeValuationAnalysis(raw, faceValueUsd, fxData, marketData);

  if (!isValuationResponseComplete(raw)) {
    logger.info('Valuation vote finalized with fallback', {
      rwa_id: submission.id,
      vote: result.vote,
      npvRatio: faceValueUsd > 0 ? (result.netPresentValue / faceValueUsd).toFixed(3) : '0',
      hadModelVote: raw.vote === 'APPROVE' || raw.vote === 'REJECT',
      hadModelReasoning: typeof raw.reasoning === 'string' && raw.reasoning.trim().length >= 10,
    });
  }

  return result;
}
