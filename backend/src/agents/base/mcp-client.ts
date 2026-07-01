import { casperMcp } from '../../services/mcp/casper-mcp';
import { csprTradeMcp } from '../../services/mcp/cspr-trade-mcp';
import logger from '../../utils/logger';

export { casperMcp, csprTradeMcp };

export async function initMcpConnections(): Promise<void> {
  await Promise.allSettled([
    casperMcp.connect(),
    csprTradeMcp.connect(),
  ]);
  logger.info('MCP connections initialized');
}
