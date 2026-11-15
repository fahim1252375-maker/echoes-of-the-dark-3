import crypto from 'node:crypto';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { isDatabaseConnected } from '../config/database';

let ephemeralDevSecret: string | null = null;

export function getJwtSecret(): string {
  const envSecret = process.env.JWT_SECRET;
  if (envSecret && !envSecret.includes('REPLACE_WITH')) {
    return envSecret;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production');
  }
  if (!ephemeralDevSecret) {
    ephemeralDevSecret = crypto.randomBytes(48).toString('hex');
  }
  return ephemeralDevSecret;
}

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    res.status(401).json({ error: 'Authentication token missing' });
    return;
  }

  try {
    const payload = jwt.verify(token, getJwtSecret()) as { sub?: string };
    if (!payload.sub) {
      res.status(401).json({ error: 'Invalid authentication token' });
      return;
    }
    req.userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired authentication token' });
  }
}

export function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) {
      try {
        const payload = jwt.verify(token, getJwtSecret()) as { sub?: string };
        if (payload.sub) {
          req.userId = payload.sub;
        }
      } catch {
        // Ignore invalid/expired token for optional auth endpoints
      }
    }
  }
  next();
}

export function requireDatabase(_req: Request, res: Response, next: NextFunction): void {
  if (!isDatabaseConnected()) {
    res.status(503).json({
      error: 'Database unavailable. Continuing in local offline mode.',
      offline: true,
    });
    return;
  }
  next();
}
