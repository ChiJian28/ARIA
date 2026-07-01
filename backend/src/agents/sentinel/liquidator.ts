import { triggerLiquidation } from '../../blockchain/contracts/settlement-engine';
import { rwaRepo } from '../../db/repositories/rwa.repo';
import { vaultRepo } from '../../db/repositories/vault.repo';
import { scoreAgentReputationsForRwa } from '../../services/agents/reputation';
import { sseEmitter } from '../../api/sse/emitter';
import { getAgentConfigs } from '../../config/agents';
import logger from '../../utils/logger';

export async function executeLiquidation(
  rwaId: string,
  reason: string,
): Promise<{ txHash?: string; success: boolean }> {
  const sentinel = getAgentConfigs().find((c) => c.id === 'sentinel');
  if (!sentinel) throw new Error('Sentinel agent config not found');

  logger.info('Executing liquidation', { rwa_id: rwaId, reason });

  try {
    const result = await triggerLiquidation(rwaId, sentinel.keyPath);

    // Update RWA status
    await rwaRepo.updateStatus(rwaId, 'DEFAULTED');

    await scoreAgentReputationsForRwa(rwaId, 'failure');

    // Record settlement event
    const submission = await rwaRepo.findById(rwaId);
    if (submission) {
      const liquidationAmount = Math.floor(submission.faceValue * (submission.collateralRatio ?? 0.75) * 1_000_000_000);
      await vaultRepo.recordSettlementEvent({
        rwaId,
        eventType: 'LIQUIDATION',
        amount: liquidationAmount.toString(),
        txHash: result.deployHash,
      });
    }

    sseEmitter.emit('SENTINEL_ALERT', {
      type: 'SENTINEL_ALERT',
      rwaId,
      data: {
        action: 'LIQUIDATION_EXECUTED',
        txHash: result.deployHash,
        reason,
      },
      timestamp: new Date().toISOString(),
    });

    logger.info('Liquidation executed', { rwa_id: rwaId, txHash: result.deployHash });
    return { txHash: result.deployHash, success: true };
  } catch (err) {
    logger.error('Liquidation failed', { rwa_id: rwaId, error: (err as Error).message });
    return { success: false };
  }
}
