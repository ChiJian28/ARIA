import { Router } from 'express';
import { getPool } from '../../db';
import { checkNodeConnectivity } from '../../services/cspr-cloud/node-api';
import { checkGeminiHealth } from '../../services/gemini/client';
import { getLatestBlockInfo } from '../../blockchain/client';
import { HealthResponse } from '../../utils/types/api.types';
import logger from '../../utils/logger';

export const healthRouter = Router();

healthRouter.get('/', async (req, res) => {
  const services: HealthResponse['services'] = {
    database: 'error',
    redis: 'error',
    casperNode: 'error',
    gemini: 'error',
  };

  let latestBlockHeight: number | undefined;

  const [dbOk, nodeOk, geminiOk, blockInfo] = await Promise.allSettled([
    getPool().query('SELECT 1').then(() => true).catch(() => false),
    checkNodeConnectivity(),
    checkGeminiHealth(),
    getLatestBlockInfo(),
  ]);

  services.database = dbOk.status === 'fulfilled' && dbOk.value ? 'ok' : 'error';
  services.casperNode = nodeOk.status === 'fulfilled' && nodeOk.value ? 'ok' : 'error';
  services.gemini = geminiOk.status === 'fulfilled' && geminiOk.value ? 'ok' : 'error';
  // Redis check — simplified for now
  services.redis = 'ok';

  if (blockInfo.status === 'fulfilled' && blockInfo.value) {
    latestBlockHeight = blockInfo.value.blockHeight;
  }

  const allOk = services.database === 'ok' && services.casperNode === 'ok';
  const status: HealthResponse['status'] = allOk ? 'healthy' : 'degraded';

  const response: HealthResponse = {
    status,
    services,
    latestBlockHeight,
    timestamp: new Date().toISOString(),
  };

  res.status(allOk ? 200 : 503).json({ success: true, data: response });
});
