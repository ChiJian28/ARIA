import { getX402Config } from '../../../config/x402';
import { x402Get } from '../client';
import { trackSpend } from '../wallet';
import logger from '../../../utils/logger';

export interface FxRateData {
  baseCurrency: string;
  quoteCurrency: string; // USD
  spotRate: number;
  forwardRates: {
    days30: number;
    days60: number;
    days90: number;
    days180: number;
  };
  volatility30d: number; // annualized
  dataSource: string;
  retrievedAt: string;
}

const MOCK_FX_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 1.085,
  GBP: 1.27,
  SGD: 0.74,
  CNY: 0.138,
  JPY: 0.0067,
  AUD: 0.645,
  HKD: 0.128,
  CHF: 1.12,
  CAD: 0.74,
};

function generateMockFxData(currency: string): FxRateData {
  const spotRate = MOCK_FX_RATES[currency] ?? 1.0;
  const volatility = currency === 'USD' ? 0 : 0.08 + Math.random() * 0.06;

  return {
    baseCurrency: currency,
    quoteCurrency: 'USD',
    spotRate,
    forwardRates: {
      days30: spotRate * (1 + (Math.random() - 0.5) * 0.01),
      days60: spotRate * (1 + (Math.random() - 0.5) * 0.015),
      days90: spotRate * (1 + (Math.random() - 0.5) * 0.02),
      days180: spotRate * (1 + (Math.random() - 0.5) * 0.035),
    },
    volatility30d: parseFloat(volatility.toFixed(4)),
    dataSource: 'MOCK_FX_PROVIDER',
    retrievedAt: new Date().toISOString(),
  };
}

export async function fetchFxRates(
  currency: string,
  rwaId: string,
): Promise<FxRateData> {
  const x402Config = getX402Config();

  // TODO: Replace mock with real x402 FX rate provider call
  // Real flow:
  // 1. Call x402Get(x402Config.providers.fxRates.baseUrl, '/v1/rates', { base: currency, quote: 'USD' })
  // 2. Handle 402 payment intercept
  // 3. Return typed FxRateData

  if (x402Config.useMock) {
    const costMotes = x402Config.providers.fxRates.costPerCallMotes;
    trackSpend(rwaId, costMotes);

    logger.info('x402 FX rates fetched (MOCK)', {
      agent_id: 'valuation',
      rwa_id: rwaId,
      currency,
      costMotes,
    });

    await new Promise((r) => setTimeout(r, 100 + Math.random() * 200));
    return generateMockFxData(currency);
  }

  const result = await x402Get<FxRateData>(
    x402Config.providers.fxRates.baseUrl,
    '/v1/rates',
    { base: currency, quote: 'USD' },
    x402Config.providers.fxRates.costPerCallMotes,
  );
  trackSpend(rwaId, result.paidAmount ?? '0');
  return result.data;
}
