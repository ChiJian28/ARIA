import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { rwaRepo } from '../../db/repositories/rwa.repo';
import { agentRepo } from '../../db/repositories/agent.repo';
import { getRwaQueue } from '../../jobs/queue';
import { RwaSubmissionSchema } from '../../utils/validators';
import { rwaSubmitRateLimit } from '../middleware/rateLimit';
import { validateUuid } from '../middleware/validation';
import { ApiError } from '../middleware/errorHandler';
import { parseInvoiceDocument } from '../../services/rwa/document-parser';
import logger from '../../utils/logger';

export const rwaRouter = Router();

const uploadLimits = {
  fileSize: 10 * 1024 * 1024,
  fields: 10,
  fieldNestingDepth: 1,
};

const documentUpload = multer({
  storage: multer.memoryStorage(),
  limits: uploadLimits as multer.Options['limits'],
  fileFilter: (_req, file, cb) => {
    const name = file.originalname.toLowerCase();
    const ok =
      file.mimetype === 'application/pdf' ||
      file.mimetype.includes('xml') ||
      file.mimetype.includes('json') ||
      name.endsWith('.pdf') ||
      name.endsWith('.xml') ||
      name.endsWith('.json');
    if (ok) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, XML, or JSON invoice documents are allowed'));
    }
  },
});

// POST /rwa/parse-document — LLM extraction + SHA-256 document hash
rwaRouter.post(
  '/parse-document',
  documentUpload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const file = req.file;
      if (!file?.buffer?.length) {
        throw new ApiError(400, 'Invoice document file is required');
      }

      const parsed = await parseInvoiceDocument(file.buffer, file.originalname, file.mimetype);

      res.json({ success: true, data: parsed });
    } catch (err) {
      next(err);
    }
  },
);

// POST /rwa/submit
rwaRouter.post('/submit', rwaSubmitRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = RwaSubmissionSchema.parse(req.body);
    const ownerPublicKey = input.ownerPublicKey;

    const submission = await rwaRepo.create(input, ownerPublicKey);

    // Enqueue pipeline job
    const queue = getRwaQueue();
    await queue.add('rwa-pipeline', { submissionId: submission.id }, {
      jobId: submission.id,
      attempts: 2,
      backoff: { type: 'exponential', delay: 5000 },
    });

    logger.info('RWA submitted', { rwa_id: submission.id, assetType: input.assetType });

    res.status(201).json({
      success: true,
      data: {
        id: submission.id,
        status: submission.status,
        message: 'RWA submitted successfully. Agents are analyzing your submission.',
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /rwa/:id
rwaRouter.get('/:id', validateUuid('id'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const submission = await rwaRepo.findById(req.params.id);
    if (!submission) throw new ApiError(404, 'RWA not found');

    res.json({ success: true, data: submission });
  } catch (err) {
    next(err);
  }
});

// GET /rwa/:id/votes
rwaRouter.get('/:id/votes', validateUuid('id'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const votes = await agentRepo.getVotesByRwa(req.params.id);
    res.json({ success: true, data: votes });
  } catch (err) {
    next(err);
  }
});

// GET /rwa (list)
rwaRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(100, parseInt(String(req.query.limit ?? '20')));
    const offset = parseInt(String(req.query.offset ?? '0'));
    const owner = req.query.owner as string | undefined;

    const submissions = owner
      ? await rwaRepo.listByOwner(owner, limit, offset)
      : await rwaRepo.listAll(limit, offset);

    res.json({ success: true, data: submissions, count: submissions.length });
  } catch (err) {
    next(err);
  }
});
