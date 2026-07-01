import { Router, Request, Response, NextFunction } from 'express';
import { getObservatoryAuditTrail } from '../../services/observatory/audit-trail';

export const observatoryRouter = Router();

// GET /observatory/audit-trail — consensus history with vote summary and per-asset APY
observatoryRouter.get('/audit-trail', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(100, parseInt(String(req.query.limit ?? '20'), 10));
    const offset = Math.max(0, parseInt(String(req.query.offset ?? '0'), 10));
    const data = await getObservatoryAuditTrail(limit, offset);
    res.json({ success: true, data, count: data.length });
  } catch (err) {
    next(err);
  }
});
