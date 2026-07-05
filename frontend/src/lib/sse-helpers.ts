import type { SseEvent } from '@/types/api.types';

/** Normalise backend SSE shape (agentId/rwaId at root, nested fields in data). */
export function getSsePayload(event: SseEvent): Record<string, unknown> {
  return event.data ?? event.payload ?? {};
}

export function getSseRwaId(event: SseEvent): string | undefined {
  if (event.rwaId) return event.rwaId;
  const payload = getSsePayload(event);
  return typeof payload.rwaId === 'string' ? payload.rwaId : undefined;
}

export function getSseAgentId(event: SseEvent): string | undefined {
  if (event.agentId) return event.agentId;
  const payload = getSsePayload(event);
  return typeof payload.agentId === 'string' ? payload.agentId : undefined;
}

const STAGE_MESSAGES: Record<string, string> = {
  credit_data_fetch: 'Paying x402 micropayment · credit bureau API…',
  market_data_fetch: 'Paying x402 micropayment · FX & market data…',
  kyc_data_fetch: 'Paying x402 micropayment · KYC/AML provider…',
  llm_analysis: 'Running Gemini inference…',
};

export function stageToMessage(stage: unknown): string | null {
  if (typeof stage !== 'string') return null;
  return STAGE_MESSAGES[stage] ?? null;
}
