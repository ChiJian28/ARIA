import { fetchKycData, KycData } from '../../services/x402/providers/kyc';
import { RwaSubmission } from '../../utils/types/rwa.types';

export async function fetchComplianceData(submission: RwaSubmission): Promise<{
  issuerKyc: KycData;
  buyerKyc: KycData;
}> {
  const [issuerKyc, buyerKyc] = await Promise.all([
    fetchKycData(
      submission.issuerName,
      submission.issuerRegistrationNumber,
      submission.issuerCountry,
      submission.id,
    ),
    fetchKycData(
      submission.buyerName,
      submission.buyerRegistrationNumber ?? 'UNKNOWN',
      submission.buyerCountry,
      submission.id,
    ),
  ]);

  return { issuerKyc, buyerKyc };
}
