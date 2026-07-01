import { RwaSubmission } from '../../utils/types/rwa.types';
import { KycData } from '../../services/x402/providers/kyc';

export const COMPLIANCE_AGENT_SYSTEM_PROMPT = `You are ARIA's Compliance Agent, a specialized AI that verifies regulatory compliance for trade finance instruments.

Your role:
- Review KYC/AML status of the asset issuer
- Check jurisdiction eligibility for DeFi lending
- Identify any sanctions, PEP, or watchlist flags
- Ensure compliance with applicable trade finance regulations

Output format: You MUST respond with a valid JSON object containing exactly these fields:
{
  "clearanceStatus": <"CLEAR"|"FLAGGED"|"REJECTED">,
  "kycVerified": <boolean>,
  "amlClear": <boolean>,
  "jurisdictionEligible": <boolean>,
  "riskLevel": <"LOW"|"MEDIUM"|"HIGH">,
  "vote": <"APPROVE"|"REJECT">,
  "confidence": <number 0.0-1.0>,
  "reasoning": <string max 500 chars>,
  "jurisdictionFlags": <array of flag strings>,
  "requiredActions": <array of required action strings or empty array>
}

Compliance rules:
- Sanctioned entity → REJECT immediately
- High-risk jurisdiction → REJECT
- PEP without enhanced due diligence → FLAGGED
- AML watchlist → FLAGGED (approve with flag)
- All clear → CLEAR → APPROVE`;

export function buildCompliancePrompt(
  submission: RwaSubmission,
  issuerKyc: KycData,
  buyerKyc: KycData,
): string {
  return `Review compliance for this trade finance instrument:

INSTRUMENT DETAILS:
- Type: ${submission.assetType}
- Face Value: ${submission.faceValue.toLocaleString()} ${submission.currency}
- Issuer: ${submission.issuerName} (${submission.issuerCountry})
- Buyer: ${submission.buyerName} (${submission.buyerCountry})

ISSUER KYC/AML STATUS:
- KYC Status: ${issuerKyc.kycStatus}
- AML Status: ${issuerKyc.amlStatus}
- PEP Check: ${issuerKyc.pepCheck ? 'FLAGGED AS PEP' : 'Clear'}
- Sanctions Check: ${issuerKyc.sanctionsCheck ? 'ON SANCTIONS LIST' : 'Clear'}
- Jurisdiction Eligible: ${issuerKyc.jurisdictionEligible ? 'Yes' : 'No'}
- Risk Rating: ${issuerKyc.riskRating}
- Flags: ${issuerKyc.flags.length > 0 ? issuerKyc.flags.join(', ') : 'None'}
- KYC Verified At: ${issuerKyc.verifiedAt ?? 'Unknown'}

BUYER KYC/AML STATUS:
- KYC Status: ${buyerKyc.kycStatus}
- AML Status: ${buyerKyc.amlStatus}
- PEP Check: ${buyerKyc.pepCheck ? 'FLAGGED AS PEP' : 'Clear'}
- Sanctions Check: ${buyerKyc.sanctionsCheck ? 'ON SANCTIONS LIST' : 'Clear'}
- Jurisdiction Eligible: ${buyerKyc.jurisdictionEligible ? 'Yes' : 'No'}
- Risk Rating: ${buyerKyc.riskRating}
- Flags: ${buyerKyc.flags.length > 0 ? buyerKyc.flags.join(', ') : 'None'}

Provide your compliance assessment as a JSON object.`;
}
