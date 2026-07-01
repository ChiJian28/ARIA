import { Router, Request, Response, NextFunction } from 'express';
import { agentRepo } from '../../db/repositories/agent.repo';
import { getAgentConfigs } from '../../config/agents';
import { resolveAgentPublicKeyHex } from '../../agents/base/signer';
import { riskAgent } from '../../agents/risk';
import { valuationAgent } from '../../agents/valuation';
import { complianceAgent } from '../../agents/compliance';
import { ApiError } from '../middleware/errorHandler';
import { AgentId } from '../../utils/types/agent.types';

export const agentsRouter = Router();

const agentStateMap = {
  risk: riskAgent,
  valuation: valuationAgent,
  compliance: complianceAgent,
};

// GET /agents
agentsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [reputations, configs] = await Promise.all([
      agentRepo.getAllReputations(),
      Promise.resolve(getAgentConfigs()),
    ]);

    const agents = configs.map((c) => {
      const rep = reputations.find((r) => r.agentId === c.id);
      const agentInstance = agentStateMap[c.id as keyof typeof agentStateMap];
      return {
        id: c.id,
        name: c.name,
        description: c.description,
        voteWeight: c.voteWeight,
        reputation: rep ?? null,
        status: agentInstance?.getState().status ?? 'IDLE',
        agentPublicKey: resolveAgentPublicKeyHex(c.id),
      };
    });

    res.json({ success: true, data: agents });
  } catch (err) {
    next(err);
  }
});

// GET /agents/leaderboard
agentsRouter.get('/leaderboard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [reputations, configs] = await Promise.all([
      agentRepo.getAllReputations(),
      Promise.resolve(getAgentConfigs()),
    ]);

    const leaderboard = reputations.map((rep, idx) => {
      const cfg = configs.find((c) => c.id === rep.agentId);
      return {
        rank: idx + 1,
        agentId: rep.agentId,
        name: cfg?.name ?? rep.agentId,
        reputationScore: rep.reputationScore,
        totalVotes: rep.totalVotes,
        correctCalls: rep.correctCalls,
        accuracy: rep.totalVotes > 0 ? Math.round((rep.correctCalls / rep.totalVotes) * 100) : 0,
        nftTokenId: rep.nftTokenId ?? null,
        agentPublicKey: resolveAgentPublicKeyHex(rep.agentId as AgentId),
      };
    });

    res.json({ success: true, data: leaderboard });
  } catch (err) {
    next(err);
  }
});

// GET /agents/:id/reputation
agentsRouter.get('/:id/reputation', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = req.params.id as AgentId;
    const reputation = await agentRepo.getReputation(agentId);
    if (!reputation) throw new ApiError(404, `Agent ${agentId} not found`);
    res.json({ success: true, data: reputation });
  } catch (err) {
    next(err);
  }
});

// GET /agents/:id/history
agentsRouter.get('/:id/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = req.params.id as AgentId;
    const limit = Math.min(50, parseInt(String(req.query.limit ?? '20')));
    const history = await agentRepo.getRecentVoteHistory(agentId, limit);
    res.json({ success: true, data: history });
  } catch (err) {
    next(err);
  }
});
