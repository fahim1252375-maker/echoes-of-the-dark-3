import { Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { Achievement, ACHIEVEMENT_IDS, AchievementId } from '../models/Achievement';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import {
  ACHIEVEMENT_CATALOG,
  evaluateAchievementEligibility,
  getOrCreateProgress,
} from '../services/progressService';

export async function getAchievements(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const unlockedDocs = await Achievement.find({ userId: req.userId }).lean();
    const unlockedMap = new Map(unlockedDocs.map((d) => [d.achievementId, d.unlockedAt]));

    const achievements = ACHIEVEMENT_IDS.map((id) => ({
      ...ACHIEVEMENT_CATALOG[id],
      unlocked: unlockedMap.has(id),
      unlockedAt: unlockedMap.get(id) ?? null,
    }));

    res.json({ achievements });
  } catch (err) {
    next(err);
  }
}

export async function unlockAchievement(
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

    const achievementId = req.body.achievementId as AchievementId;
    const progress = await getOrCreateProgress(req.userId!);

    if (!evaluateAchievementEligibility(achievementId, progress)) {
      res.status(403).json({
        error: 'Achievement conditions have not yet been verified on your progress record',
      });
      return;
    }

    await Achievement.updateOne(
      { userId: req.userId, achievementId },
      { $setOnInsert: { userId: req.userId, achievementId, unlockedAt: new Date() } },
      { upsert: true }
    );

    res.json({
      unlocked: true,
      achievement: ACHIEVEMENT_CATALOG[achievementId],
    });
  } catch (err) {
    next(err);
  }
}
