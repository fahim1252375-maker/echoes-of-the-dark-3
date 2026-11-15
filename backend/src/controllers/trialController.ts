import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { isDatabaseConnected } from '../config/database';
import { User } from '../models/User';
import { TrialRun } from '../models/TrialRun';
import {
  formatShareCode,
  generateTrialBlueprint,
  getDailyUtcInfo,
  TrialDifficulty,
} from '../services/geminiService';

export function calculateTrialScore(
  difficulty: TrialDifficulty,
  fragmentsCollected: number,
  completionTimeSeconds: number
): number {
  const mult = difficulty === 'Expert' ? 1.5 : difficulty === 'Explorer' ? 1.2 : 1.0;
  const base = 1500 + Math.max(0, fragmentsCollected) * 250 + Math.max(0, Math.round(500 - Math.min(500, completionTimeSeconds)));
  return Math.round(base * mult);
}

export async function getDailyTrial(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const daily = getDailyUtcInfo();
    const generated = await generateTrialBlueprint(daily.seed, daily.difficulty);
    res.json({
      dateUtc: daily.dateUtc,
      isDaily: true,
      ...generated,
    });
  } catch (err) {
    next(err);
  }
}

export async function completeTrialRun(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: errors.array()[0].msg });
      return;
    }

    const {
      seed,
      difficulty,
      isDaily,
      completionTimeSeconds,
      fragmentsCollected = 0,
      pulsesUsed = 0,
    } = req.body as {
      seed: number;
      difficulty: TrialDifficulty;
      isDaily?: boolean;
      completionTimeSeconds: number;
      fragmentsCollected?: number;
      pulsesUsed?: number;
    };

    if (completionTimeSeconds < 8 || completionTimeSeconds > 86400) {
      res.status(400).json({ error: 'Trial completion time out of valid bounds (8s - 86400s)' });
      return;
    }

    const daily = getDailyUtcInfo();
    const shareCode = formatShareCode(seed, difficulty);
    const verifiedScore = calculateTrialScore(difficulty, fragmentsCollected, completionTimeSeconds);

    if (!isDatabaseConnected()) {
      res.json({
        saved: false,
        offline: true,
        score: verifiedScore,
        shareCode,
      });
      return;
    }

    let explorerName = 'Guest Seeker';
    let avatar = 'cyan-seeker';
    if (req.userId) {
      const user = await User.findById(req.userId).select('username avatar').lean();
      if (user) {
        explorerName = user.username;
        avatar = user.avatar || 'cyan-seeker';
      }
    }

    const validDaily = Boolean(isDaily) && Number(seed) === daily.seed;
    const run = await TrialRun.create({
      userId: req.userId ?? null,
      explorerName,
      avatar,
      dateUtc: daily.dateUtc,
      seed: Math.abs(Math.floor(seed)) >>> 0,
      shareCode,
      difficulty,
      isDaily: validDaily,
      completionTimeSeconds: Math.round(completionTimeSeconds * 10) / 10,
      fragmentsCollected: Math.max(0, Math.min(12, Math.round(fragmentsCollected))),
      pulsesUsed: Math.max(0, Math.round(pulsesUsed)),
      score: verifiedScore,
    });

    res.status(201).json({
      saved: true,
      offline: false,
      score: verifiedScore,
      shareCode,
      runId: String(run._id),
    });
  } catch (err) {
    next(err);
  }
}
