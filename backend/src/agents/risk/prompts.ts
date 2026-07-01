import { RwaSubmission } from '../../utils/types/rwa.types';
import { CreditData } from '../../services/x402/providers/credit';

export const RISK_AGENT_SYSTEM_PROMPT = `You are ARIA's Risk Assessment Agent, a specialized AI that evaluates the credit risk of trade finance instruments.

Your role:
- Analyze credit data from external bureaus to assess the probability of default
- Evaluate issuer financial health, payment history, and business stability
- Consider counterparty risk (buyer's ability to pay)
- Generate a risk score and recommend a financing rate

Output format: You MUST respond with a valid JSON object containing exactly these fields:
{
  "probabilityOfDefault": <number 0.0-1.0>,
  "creditScore": <number 300-850>,
  "suggestedRate": <number 0.0-0.5 representing annual interest rate>,
  "riskTier": <"A"|"B"|"C"|"D">,
  "vote": <"APPROVE"|"REJECT">,
  "confidence": <number 0.0-1.0>,
  "reasoning": <string max 500 chars>,
  "flags": <array of risk flag strings>
}

Risk tiers:
- A: PD < 0.05, Score > 750 → approve, low rate
- B: PD 0.05-0.12, Score 650-750 → approve, standard rate
- C: PD 0.12-0.25, Score 550-650 → approve with caution, higher rate
- D: PD > 0.25 or Score < 550 → reject`;

export function buildRiskPrompt(submission: RwaSubmission, creditData: CreditData): string {
  const termDays = Math.ceil(
    (submission.dueDate.getTime() - submission.issueDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  return `Evaluate the credit risk for this trade finance instrument:

INSTRUMENT DETAILS:
- Type: ${submission.assetType}
- Face Value: ${submission.faceValue.toLocaleString()} ${submission.currency}
- Payment Term: ${termDays} days
- Issuer: ${submission.issuerName} (${submission.issuerCountry})
- Buyer: ${submission.buyerName} (${submission.buyerCountry})

CREDIT BUREAU DATA:
- Credit Score: ${creditData.creditScore}/850
- Probability of Default (bureau): ${(creditData.probabilityOfDefault * 100).toFixed(2)}%
- Business Age: ${creditData.businessAge} years
- Annual Revenue: $${(creditData.annualRevenue ?? 0).toLocaleString()}
- Total Transactions: ${creditData.tradeHistory.totalTransactions}
- Average Payment Days: ${creditData.tradeHistory.avgPaymentDays}
- Late Payments: ${creditData.tradeHistory.latePayments}
- Historical Defaults: ${creditData.tradeHistory.defaults}
- Delinquency Flags: ${creditData.delinquencyFlags.length > 0 ? creditData.delinquencyFlags.join(', ') : 'None'}

Based on this data, provide your risk assessment as a JSON object.`;
}
