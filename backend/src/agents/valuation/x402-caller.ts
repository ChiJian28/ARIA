import { fetchFxRates, FxRateData } from '../../services/x402/providers/fx-rates';
import { fetchMarketData, MarketData } from '../../services/x402/providers/market-data';
import { RwaSubmission } from '../../utils/types/rwa.types';

export async function fetchValuationData(submission: RwaSubmission): Promise<{
  fxData: FxRateData;
  marketData: MarketData;
}> {
  const termDays = Math.ceil(
    (submission.dueDate.getTime() - submission.issueDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  const [fxData, marketData] = await Promise.all([
    fetchFxRates(submission.currency, submission.id),
    fetchMarketData(submission.assetType, submission.currency, termDays, submission.id),
  ]);

  return { fxData, marketData };
}
