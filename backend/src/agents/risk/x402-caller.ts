import { fetchCreditData, CreditData } from '../../services/x402/providers/credit';
import { RwaSubmission } from '../../utils/types/rwa.types';

export async function fetchRiskData(submission: RwaSubmission): Promise<{
  issuerCredit: CreditData;
  buyerCredit: CreditData;
}> {
  // Fetch credit data for both issuer and buyer in parallel
  const [issuerCredit, buyerCredit] = await Promise.all([
    fetchCreditData(
      submission.issuerName,
      submission.issuerRegistrationNumber,
      submission.issuerCountry,
      submission.id,
    ),
    fetchCreditData(
      submission.buyerName,
      submission.buyerRegistrationNumber ?? 'UNKNOWN',
      submission.buyerCountry,
      submission.id,
    ),
  ]);

  return { issuerCredit, buyerCredit };
}
