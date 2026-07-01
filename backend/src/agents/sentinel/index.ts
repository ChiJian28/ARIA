import { rwaRepo } from '../../db/repositories/rwa.repo';
import { monitorPosition } from './monitor';
import { executeLiquidation } from './liquidator';
import { sseEmitter } from '../../api/sse/emitter';
import { config } from '../../config';
import logger from '../../utils/logger';

export interface SentinelScanResult {
  scanned: number;
  alerts: number;
  liquidations: number;
  errors: string[];
}

export async function runSentinelScan(): Promise<SentinelScanResult> {
  const startMs = Date.now();
  logger.info('Sentinel scan started', { agent_id: 'sentinel' });

  const activePositions = await rwaRepo.listActive();
  const result: SentinelScanResult = {
    scanned: activePositions.length,
    alerts: 0,
    liquidations: 0,
    errors: [],
  };

  for (const submission of activePositions) {
    try {
      const monitorResult = await monitorPosition(submission);

      if (monitorResult.severity === 'NONE') continue;

      result.alerts++;

      logger.warn('Sentinel alert detected', {
        agent_id: 'sentinel',
        rwa_id: submission.id,
        alertType: monitorResult.alertType,
        severity: monitorResult.severity,
        riskDelta: monitorResult.riskDelta,
      });

      sseEmitter.emit('SENTINEL_ALERT', {
        type: 'SENTINEL_ALERT',
        rwaId: submission.id,
        agentId: 'sentinel',
        data: {
          alertType: monitorResult.alertType,
          severity: monitorResult.severity,
          riskDelta: monitorResult.riskDelta,
          recommendedAction: monitorResult.recommendedAction,
          reasoning: monitorResult.reasoning,
          signals: monitorResult.marketSignals,
        },
        timestamp: new Date().toISOString(),
      });

      // Trigger liquidation if threshold exceeded
      if (
        monitorResult.riskDelta > config.LIQUIDATION_THRESHOLD &&
        (monitorResult.recommendedAction === 'FULL_LIQUIDATION' ||
          monitorResult.severity === 'CRITICAL')
      ) {
        const liquidationResult = await executeLiquidation(
          submission.id,
          monitorResult.reasoning,
        );

        if (liquidationResult.success) {
          result.liquidations++;
        }
      }
    } catch (err) {
      const error = `Failed to monitor ${submission.id}: ${(err as Error).message}`;
      result.errors.push(error);
      logger.error('Sentinel scan error', { agent_id: 'sentinel', rwa_id: submission.id, error });
    }
  }

  logger.info('Sentinel scan complete', {
    agent_id: 'sentinel',
    ...result,
    durationMs: Date.now() - startMs,
  });

  return result;
}
