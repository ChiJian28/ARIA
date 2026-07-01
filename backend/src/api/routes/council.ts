import { Router, Request, Response, NextFunction } from 'express';
import { rwaRepo } from '../../db/repositories/rwa.repo';
import { agentRepo } from '../../db/repositories/agent.repo';
import { validateUuid } from '../middleware/validation';

export const councilRouter = Router();

// GET /council/pending
councilRouter.get('/pending', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pending = await rwaRepo.listPending();
    const analyzing = (await rwaRepo.listAll(100, 0)).filter(
      (r) => r.status === 'ANALYZING' || r.status === 'VOTING',
    );

    res.json({
      success: true,
      data: {
        pending,
        inProgress: analyzing,
        totalPending: pending.length,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /council/votes/:rwaId
councilRouter.get('/votes/:rwaId', validateUuid('rwaId'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const votes = await agentRepo.getVotesByRwa(req.params.rwaId);
    const submission = await rwaRepo.findById(req.params.rwaId);

    const approveVotes = votes.filter((v) => v.vote === 'APPROVE').length;
    const rejectVotes = votes.filter((v) => v.vote === 'REJECT').length;
    const consensusReached = approveVotes >= 3 || rejectVotes >= 2;

    res.json({
      success: true,
      data: {
        rwaId: req.params.rwaId,
        status: submission?.status,
        votes,
        summary: {
          total: votes.length,
          approve: approveVotes,
          reject: rejectVotes,
          consensusReached,
          approved: approveVotes >= 3,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});
