import { generateJson } from '../../services/gemini/client';
import { SENTINEL_SYSTEM_PROMPT, buildSentinelPrompt } from './prompts';
import { RwaSubmission } from '../../utils/types/rwa.types';
import { SentinelAlert } from '../../utils/types/agent.types';

export interface MonitorResult {
  riskDelta: number;
  alertType: SentinelAlert['alertType'] | 'NONE';
  severity: SentinelAlert['severity'] | 'NONE';
  recommendedAction: SentinelAlert['recommendedAction'];
  reasoning: string;
  marketSignals: string[];
}

export async function monitorPosition(submission: RwaSubmission): Promise<MonitorResult> {
  const now = Date.now();
  const daysUntilDue = Math.ceil((submission.dueDate.getTime() - now) / (1000 * 60 * 60 * 24));

  if (daysUntilDue < 0) {
    return {
      riskDelta: 0.5,
      alertType: 'LATE_PAYMENT',
      severity: 'HIGH',
      recommendedAction: 'PARTIAL_LIQUIDATION',
      reasoning: `Instrument is ${Math.abs(daysUntilDue)} days past due date`,
      marketSignals: ['PAST_DUE'],
    };
  }

  const prompt = buildSentinelPrompt(submission, daysUntilDue);

  const result = await generateJson<MonitorResult>(
    SENTINEL_SYSTEM_PROMPT,
    prompt,
    { agent_id: 'sentinel', rwa_id: submission.id },
  );

  return {
    riskDelta: Math.max(-1, Math.min(1, result.riskDelta ?? 0)),
    alertType: result.alertType ?? 'NONE',
    severity: result.severity ?? 'NONE',
    recommendedAction: result.recommendedAction ?? 'MONITOR',
    reasoning: String(result.reasoning ?? '').substring(0, 300),
    marketSignals: Array.isArray(result.marketSignals) ? result.marketSignals : [],
  };
}
