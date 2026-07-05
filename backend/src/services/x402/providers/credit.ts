import { getX402Config } from '../../../config/x402';
import { x402Get } from '../client';
import { trackSpend } from '../wallet';
import logger from '../../../utils/logger';

export interface CreditData {
  entityId: string;
  creditScore: number;          // 300-850
  probabilityOfDefault: number; // 0-1
  tradeHistory: {
    totalTransactions: number;
    avgPaymentDays: number;
    latePayments: number;
    defaults: number;
  };
  delinquencyFlags: string[];
  businessAge: number;           // years
  annualRevenue?: number;        // USD
  dataSource: string;
  retrievedAt: string;
}

export function generateMockCreditData(entityName: string, country: string): CreditData {
  // Deterministic mock based on entity name hash for consistent testing
  const hashCode = entityName.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const seed = hashCode % 100;

  const creditScore = 600 + (seed * 2.5);
  const probabilityOfDefault = Math.max(0.01, Math.min(0.35, (100 - seed) / 300));

  return {
    entityId: `MOCK-${Buffer.from(entityName).toString('hex').substring(0, 8).toUpperCase()}`,
    creditScore: Math.round(creditScore),
    probabilityOfDefault: parseFloat(probabilityOfDefault.toFixed(4)),
    tradeHistory: {
      totalTransactions: 50 + seed * 3,
      avgPaymentDays: 28 + (seed % 15),
      latePayments: Math.floor(seed / 20),
      defaults: seed > 80 ? 1 : 0,
    },
    delinquencyFlags: seed > 85 ? ['MINOR_DELAY_2023'] : [],
    businessAge: 3 + (seed % 15),
    annualRevenue: 500_000 + seed * 50_000,
    dataSource: 'MOCK_CREDIT_BUREAU',
    retrievedAt: new Date().toISOString(),
  };
}

export async function fetchCreditData(
  entityName: string,
  registrationNumber: string,
  country: string,
  rwaId: string,
): Promise<CreditData> {
  const x402Config = getX402Config();

  // TODO: Replace mock with real x402 credit bureau call
  // Real flow:
  // 1. Call x402Get(x402Config.providers.creditBureau.baseUrl, '/v1/credit-check', { entity, reg, country })
  // 2. If 402 returned, auto-pay and retry
  // 3. Parse and return typed CreditData

  if (x402Config.useMock) {
    const costMotes = x402Config.providers.creditBureau.costPerCallMotes;
    trackSpend(rwaId, costMotes);

    logger.info('x402 credit data fetched (MOCK)', {
      agent_id: 'risk',
      rwa_id: rwaId,
      entityName,
      country,
      costMotes,
    });

    await new Promise((r) => setTimeout(r, 300 + Math.random() * 500)); // simulate latency
    return generateMockCreditData(entityName, country);
  }

  const result = await x402Get<CreditData>(
    x402Config.providers.creditBureau.baseUrl,
    '/v1/credit-check',
    { entity: entityName, reg: registrationNumber, country },
    x402Config.providers.creditBureau.costPerCallMotes,
  );
  trackSpend(rwaId, result.paidAmount ?? '0');
  return result.data;
}
