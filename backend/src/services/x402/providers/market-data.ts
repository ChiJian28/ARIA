import { getX402Config } from '../../../config/x402';
import { x402Get } from '../client';
import { trackSpend } from '../wallet';
import logger from '../../../utils/logger';

export interface MarketData {
  assetClass: string;
  sector: string;
  benchmarkYield: number;     // annualized %
  discountRate: number;       // annualized %
  comparables: {
    label: string;
    yield: number;
    term: number; // days
    rating: string;
  }[];
  marketCondition: 'FAVORABLE' | 'NEUTRAL' | 'UNFAVORABLE';
  dataSource: string;
  retrievedAt: string;
}

function generateMockMarketData(assetClass: string, currency: string): MarketData {
  const baseYields: Record<string, number> = {
    INVOICE: 0.085,
    PURCHASE_ORDER: 0.09,
    TRADE_RECEIVABLE: 0.1,
  };

  const baseYield = baseYields[assetClass] ?? 0.09;
  const variance = (Math.random() - 0.5) * 0.02;

  return {
    assetClass,
    sector: 'TRADE_FINANCE',
    benchmarkYield: parseFloat((baseYield + variance).toFixed(4)),
    discountRate: parseFloat((baseYield + variance + 0.02).toFixed(4)),
    comparables: [
      { label: 'Similar Invoice A', yield: baseYield - 0.01, term: 60, rating: 'BBB+' },
      { label: 'Similar Invoice B', yield: baseYield + 0.005, term: 90, rating: 'BBB' },
      { label: 'Market Index', yield: baseYield, term: 30, rating: 'A-' },
    ],
    marketCondition: Math.random() > 0.3 ? 'FAVORABLE' : 'NEUTRAL',
    dataSource: 'MOCK_MARKET_DATA_PROVIDER',
    retrievedAt: new Date().toISOString(),
  };
}

export async function fetchMarketData(
  assetClass: string,
  currency: string,
  termDays: number,
  rwaId: string,
): Promise<MarketData> {
  const x402Config = getX402Config();

  // TODO: Replace mock with real x402 market data provider call
  // Real flow:
  // 1. Call x402Get(x402Config.providers.marketData.baseUrl, '/v1/benchmarks', { assetClass, currency, term: termDays })
  // 2. Handle 402 payment intercept
  // 3. Return typed MarketData

  if (x402Config.useMock) {
    const costMotes = x402Config.providers.marketData.costPerCallMotes;
    trackSpend(rwaId, costMotes);

    logger.info('x402 market data fetched (MOCK)', {
      agent_id: 'valuation',
      rwa_id: rwaId,
      assetClass,
      currency,
      termDays,
      costMotes,
    });

    await new Promise((r) => setTimeout(r, 150 + Math.random() * 250));
    return generateMockMarketData(assetClass, currency);
  }

  const result = await x402Get<MarketData>(
    x402Config.providers.marketData.baseUrl,
    '/v1/benchmarks',
    { assetClass, currency, term: String(termDays) },
    x402Config.providers.marketData.costPerCallMotes,
  );
  trackSpend(rwaId, result.paidAmount ?? '0');
  return result.data;
}
