import rateLimit from 'express-rate-limit';
import { config } from '../../config';

export const generalRateLimit = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later' },
});

export const rwaSubmitRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: config.RWA_SUBMIT_RATE_LIMIT,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'RWA submission rate limit exceeded (max 5/hour)' },
});
