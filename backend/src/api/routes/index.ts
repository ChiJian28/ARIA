import { Router } from 'express';
import { rwaRouter } from './rwa';
import { vaultRouter } from './vault';
import { agentsRouter } from './agents';
import { councilRouter } from './council';
import { observatoryRouter } from './observatory';
import { healthRouter } from './health';
import { sseRouter } from '../sse/stream';
import { x402GatewayRouter } from './x402-gateway';

export const apiRouter = Router();

apiRouter.use('/rwa', rwaRouter);
apiRouter.use('/vault', vaultRouter);
apiRouter.use('/agents', agentsRouter);
apiRouter.use('/council', councilRouter);
apiRouter.use('/observatory', observatoryRouter);
apiRouter.use('/health', healthRouter);
apiRouter.use('/sse', sseRouter);
apiRouter.use('/x402-gateway', x402GatewayRouter);
