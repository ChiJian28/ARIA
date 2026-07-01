import { RwaSubmission } from '../../utils/types/rwa.types';
import { FxRateData } from '../../services/x402/providers/fx-rates';
import { MarketData } from '../../services/x402/providers/market-data';

export const VALUATION_AGENT_SYSTEM_PROMPT = `You are ARIA's Valuation Agent, a specialized AI that prices trade finance instruments.

Your role:
- Calculate the net present value (NPV) of the instrument considering FX risk and discount rates
- Compare against market benchmarks to determine fair value
- Recommend an appropriate collateral ratio for vault lending
- Decide whether the instrument meets minimum valuation standards

Output format: You MUST respond with a valid JSON object containing exactly these fields:
{
  "fairValueUsd": <number>,
  "netPresentValue": <number>,
  "discountRate": <number 0.0-0.5>,
  "fxAdjustedValue": <number>,
  "collateralRatio": <number 0.5-0.95>,
  "marketConditionScore": <number 0.0-1.0>,
  "vote": <"APPROVE"|"REJECT">,
  "confidence": <number 0.0-1.0>,
  "reasoning": <string, max 200 chars — keep brief>
}

Valuation rules:
- NPV must be > 80% of face value to approve
- Collateral ratio: A-grade → 0.85, B → 0.75, C → 0.65
- High FX volatility (>15% annualized) → apply 10% haircut
- Unfavorable market → increase discount rate by 2%`;

export function buildValuationPrompt(
  submission: RwaSubmission,
  fxData: FxRateData,
  marketData: MarketData,
): string {
  const termDays = Math.ceil(
    (submission.dueDate.getTime() - submission.issueDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  const faceValueUsd = submission.faceValue * fxData.spotRate;

  return `Value this trade finance instrument:

INSTRUMENT DETAILS:
- Type: ${submission.assetType}
- Face Value: ${submission.faceValue.toLocaleString()} ${submission.currency}
- Face Value (USD): $${faceValueUsd.toLocaleString()}
- Payment Term: ${termDays} days
- Issuer Country: ${submission.issuerCountry}
- Buyer Country: ${submission.buyerCountry}

FX RATE DATA (${submission.currency}/USD):
- Spot Rate: ${fxData.spotRate}
- 60-day Forward: ${fxData.forwardRates.days60}
- 90-day Forward: ${fxData.forwardRates.days90}
- 30-day Volatility: ${(fxData.volatility30d * 100).toFixed(2)}%

MARKET BENCHMARKS:
- Asset Class: ${marketData.assetClass}
- Benchmark Yield: ${(marketData.benchmarkYield * 100).toFixed(2)}%
- Discount Rate: ${(marketData.discountRate * 100).toFixed(2)}%
- Market Condition: ${marketData.marketCondition}
- Comparable Instruments:
${marketData.comparables.map((c) => `  * ${c.label}: ${(c.yield * 100).toFixed(2)}% yield, ${c.term}d term, ${c.rating} rating`).join('\n')}

Provide your valuation analysis as a JSON object.`;
}
