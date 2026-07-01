import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { ApiError } from './errorHandler';
import logger from '../../utils/logger';

// Simple API key middleware for protected routes
export function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-api-key'] as string | undefined;
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, config.JWT_SECRET) as { sub: string };
      (req as Request & { userId: string }).userId = decoded.sub;
      next();
      return;
    } catch {
      throw new ApiError(401, 'Invalid JWT token');
    }
  }

  // For demo, allow access without auth — add real auth before production
  logger.debug('Request without auth', { url: req.url, ip: req.ip });
  next();
}

export function generateToken(userId: string): string {
  return jwt.sign({ sub: userId }, config.JWT_SECRET, { expiresIn: '24h' });
}
