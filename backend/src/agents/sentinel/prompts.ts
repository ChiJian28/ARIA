import { RwaSubmission } from '../../utils/types/rwa.types';

export const SENTINEL_SYSTEM_PROMPT = `You are ARIA's Sentinel Agent, a continuous monitoring AI that watches approved trade finance positions for early warning risk signals.

Your role:
- Analyze current position state against original approval metrics
- Detect risk deterioration signals (late payments, counterparty distress, market shifts)
- Calculate risk delta — how much risk has increased since approval
- Recommend protective actions (monitor, partial liquidation, full liquidation)

Output format: You MUST respond with a valid JSON object containing exactly these fields:
{
  "riskDelta": <number -1.0 to 1.0, positive = increased risk>,
  "alertType": <"NONE"|"RISK_SPIKE"|"COUNTERPARTY_DISTRESS"|"LATE_PAYMENT"|"MARKET_DETERIORATION">,
  "severity": <"NONE"|"LOW"|"MEDIUM"|"HIGH"|"CRITICAL">,
  "recommendedAction": <"MONITOR"|"PARTIAL_LIQUIDATION"|"FULL_LIQUIDATION">,
  "reasoning": <string max 300 chars>,
  "marketSignals": <array of observed signal strings>
}`;

export function buildSentinelPrompt(submission: RwaSubmission, daysUntilDue: number): string {
  const originalRiskScore = submission.riskScore ?? 0;
  const approvedAt = submission.updatedAt.toISOString();

  return `Monitor this active trade finance position:

POSITION DETAILS:
- RWA ID: ${submission.id}
- Type: ${submission.assetType}
- Face Value: ${submission.faceValue.toLocaleString()} ${submission.currency}
- Issuer: ${submission.issuerName} (${submission.issuerCountry})
- Buyer: ${submission.buyerName} (${submission.buyerCountry})
- Due Date: ${submission.dueDate.toISOString()} (${daysUntilDue} days remaining)
- Approved At: ${approvedAt}

RISK METRICS AT APPROVAL:
- Risk Score (PD): ${originalRiskScore.toFixed(4)}
- Collateral Ratio: ${submission.collateralRatio?.toFixed(4) ?? 'unknown'}

CURRENT MARKET CONTEXT:
- Days Until Maturity: ${daysUntilDue}
- Time Since Approval: ${Math.floor((Date.now() - submission.updatedAt.getTime()) / (1000 * 60 * 60 * 24))} days

Analyze this position for risk signals and provide your assessment.`;
}
