import express, { Router } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { isDatabaseConnected } from './config/database';
import { apiRateLimiter } from './middleware/rateLimiter';
import { errorHandler, notFoundHandler } from './middleware/errorMiddleware';
import { getWorldStats } from './controllers/statsController';
import authRoutes from './routes/authRoutes';
import playerRoutes from './routes/playerRoutes';
import progressRoutes from './routes/progressRoutes';
import leaderboardRoutes from './routes/leaderboardRoutes';
import achievementRoutes from './routes/achievementRoutes';
import aiRoutes from './routes/aiRoutes';
import trialRoutes from './routes/trialRoutes';

export function createApiRouter(): Router {
  const api = express.Router();

  const allowedOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  api.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'none'"],
        },
      },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );
  api.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error('Origin not allowed by CORS'));
      },
      credentials: false,
      methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  const visionJsonParser = express.json({ limit: '3500kb' });
  const defaultJsonParser = express.json({ limit: '64kb' });
  api.use('/ai/trial-from-image', visionJsonParser);
  api.use((req, res, next) => {
    if (req.path === '/ai/trial-from-image') return next();
    return defaultJsonParser(req, res, next);
  });
  api.use(apiRateLimiter);

  api.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      database: isDatabaseConnected() ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    });
  });

  api.get('/stats', getWorldStats);

  api.use('/auth', authRoutes);
  api.use('/player', playerRoutes);
  api.use('/progress', progressRoutes);
  api.use('/leaderboard', leaderboardRoutes);
  api.use('/achievements', achievementRoutes);
  api.use('/ai', aiRoutes);
  api.use('/trial', trialRoutes);

  api.use(notFoundHandler);
  api.use(errorHandler);

  return api;
}

export function createStandaloneBackendApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use('/api', createApiRouter());
  return app;
}
