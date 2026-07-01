import { submitMockDeploy } from '../transactions/submitter';
import logger from '../../utils/logger';
import { DeployResult } from '../../utils/types/blockchain.types';

export async function processRepayment(
  rwaId: string,
  amountMotes: string,
  signerKeyPath: string,
): Promise<DeployResult> {
  // TODO: Call settlement_engine.process_repayment entry point
  logger.info('processRepayment called (mock)', { rwa_id: rwaId, amountMotes });
  return submitMockDeploy(`repayment-${rwaId}`);
}

export async function distributeYield(
  rwaId: string,
  signerKeyPath: string,
): Promise<DeployResult> {
  // TODO: Call settlement_engine.distribute_yield entry point
  logger.info('distributeYield called (mock)', { rwa_id: rwaId });
  return submitMockDeploy(`yield-${rwaId}`);
}

export async function triggerLiquidation(
  rwaId: string,
  signerKeyPath: string,
): Promise<DeployResult> {
  // TODO: Call settlement_engine.trigger_liquidation entry point
  logger.info('triggerLiquidation called (mock)', { rwa_id: rwaId });
  return submitMockDeploy(`liquidate-${rwaId}`);
}
