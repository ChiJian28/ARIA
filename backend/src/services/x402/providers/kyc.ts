import { getX402Config } from '../../../config/x402';
import { x402Post } from '../client';
import { trackSpend } from '../wallet';
import logger from '../../../utils/logger';

export interface KycData {
  entityId: string;
  kycStatus: 'VERIFIED' | 'PENDING' | 'FAILED' | 'NOT_FOUND';
  amlStatus: 'CLEAR' | 'WATCHLIST' | 'SANCTIONED';
  pepCheck: boolean;           // politically exposed person
  sanctionsCheck: boolean;     // on sanctions list
  jurisdictionEligible: boolean;
  riskRating: 'LOW' | 'MEDIUM' | 'HIGH';
  flags: string[];
  verifiedAt?: string;
  dataSource: string;
  retrievedAt: string;
}

export function generateMockKycData(
  entityName: string,
  country: string,
  registrationNumber: string,
): KycData {
  const hashCode = (entityName + registrationNumber).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const seed = hashCode % 100;

  const highRiskCountries = ['CN', 'RU', 'IR', 'KP'];
  const isHighRiskCountry = highRiskCountries.includes(country);

  return {
    entityId: `KYC-${registrationNumber}`,
    kycStatus: 'VERIFIED',
    amlStatus: seed > 95 ? 'WATCHLIST' : 'CLEAR',
    pepCheck: seed > 98,
    sanctionsCheck: false,
    jurisdictionEligible: !isHighRiskCountry,
    riskRating: isHighRiskCountry ? 'HIGH' : seed > 90 ? 'MEDIUM' : 'LOW',
    flags: isHighRiskCountry ? ['HIGH_RISK_JURISDICTION'] : seed > 90 ? ['ENHANCED_DUE_DILIGENCE_REQUIRED'] : [],
    verifiedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    dataSource: 'MOCK_KYC_PROVIDER',
    retrievedAt: new Date().toISOString(),
  };
}

export async function fetchKycData(
  entityName: string,
  registrationNumber: string,
  country: string,
  rwaId: string,
): Promise<KycData> {
  const x402Config = getX402Config();

  // TODO: Replace mock with real x402 KYC/AML provider call
  // Real flow:
  // 1. Call x402Post(x402Config.providers.kyc.baseUrl, '/v1/kyc-check', { entity, reg, country })
  // 2. Handle 402 payment (KYC checks are most expensive: ~0.1 CSPR per call)
  // 3. Return typed KycData

  if (x402Config.useMock) {
    const costMotes = x402Config.providers.kyc.costPerCallMotes;
    trackSpend(rwaId, costMotes);

    logger.info('x402 KYC data fetched (MOCK)', {
      agent_id: 'compliance',
      rwa_id: rwaId,
      entityName,
      country,
      costMotes,
    });

    await new Promise((r) => setTimeout(r, 400 + Math.random() * 600));
    return generateMockKycData(entityName, country, registrationNumber);
  }

  const result = await x402Post<KycData>(
    x402Config.providers.kyc.baseUrl,
    '/v1/kyc-check',
    { entityName, registrationNumber, country },
    x402Config.providers.kyc.costPerCallMotes,
  );
  trackSpend(rwaId, result.paidAmount ?? '0');
  return result.data;
}
