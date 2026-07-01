import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from '../config';
import { apiRouter } from './routes';
import { errorHandler } from './middleware/errorHandler';
import { generalRateLimit } from './middleware/rateLimit';
import logger from '../utils/logger';

export function createServer(): express.Application {
  const app = express();

  // Security headers
  app.use(helmet());

  // CORS
  const allowedOrigins = config.CORS_ORIGINS.split(',').map((o) => o.trim());
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    credentials: true,
  }));

  // Body parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Rate limiting
  app.use(generalRateLimit);

  // Request logging
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      logger.debug('HTTP request', {
        method: req.method,
        url: req.url,
        status: res.statusCode,
        durationMs: Date.now() - start,
        ip: req.ip,
      });
    });
    next();
  });

  // API routes
  app.use('/api', apiRouter);

  // Root
  app.get('/', (req, res) => {
    res.json({
      name: 'ARIA Backend',
      version: '1.0.0',
      description: 'Autonomous RWA Intelligence Agent',
      docs: '/api/health',
    });
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ success: false, error: `Route ${req.method} ${req.url} not found` });
  });

  // Global error handler
  app.use(errorHandler);

  return app;
}
