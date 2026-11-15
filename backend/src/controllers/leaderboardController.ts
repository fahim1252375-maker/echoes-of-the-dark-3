import { Request, Response, NextFunction } from 'express';
import { GameProgress } from '../models/GameProgress';
import { TrialRun } from '../models/TrialRun';
import { Ghost } from '../models/Ghost';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { isDatabaseConnected } from '../config/database';
import { getDailyUtcInfo } from '../services/geminiService';

function sumBestTimes(timesMap: Map<string, number> | Record<string, number> | undefined): number | null {
  if (!timesMap) return null;
  const entries =
    timesMap instanceof Map ? Array.from(timesMap.entries()) : Object.entries(timesMap);
  if (entries.length === 0) return null;
  return entries.reduce((acc, [, val]) => acc + val, 0);
}

export async function getLeaderboard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const category = String(req.query.category || 'score');

    if (!isDatabaseConnected()) {
      res.json({ offline: true, category, entries: [] });
      return;
    }

    if (category === 'daily') {
      const daily = getDailyUtcInfo();
      const runs = await TrialRun.find({ isDaily: true, dateUtc: daily.dateUtc })
        .sort({ score: -1, completionTimeSeconds: 1 })
        .limit(25)
        .lean();

      res.json({
        offline: false,
        category: 'daily',
        dateUtc: daily.dateUtc,
        entries: runs.map((r, idx) => ({
          rank: idx + 1,
          userId: r.userId ? String(r.userId) : `guest-${String(r._id)}`,
          username: r.explorerName,
          avatar: r.avatar || 'cyan-seeker',
          totalScore: r.score,
          fragmentsCount: r.fragmentsCollected,
          completedCount: 1,
          bestTotalTime: r.completionTimeSeconds,
          shareCode: r.shareCode,
        })),
      });
      return;
    }

    const records = await GameProgress.find({})
      .populate('userId', 'username avatar')
      .lean();

    const formatted = records
      .filter((r) => r.userId && typeof r.userId === 'object' && 'username' in r.userId)
      .map((r) => {
        const userObj = r.userId as unknown as { _id: string; username: string; avatar: string };
        const bestTotalTime = sumBestTimes(r.bestCompletionTimes as unknown as Record<string, number>);
        return {
          userId: String(userObj._id),
          username: userObj.username,
          avatar: userObj.avatar,
          totalScore: r.totalScore ?? 0,
          fragmentsCount: Array.isArray(r.collectedFragments) ? r.collectedFragments.length : 0,
          completedCount: Array.isArray(r.completedLevels) ? r.completedLevels.length : 0,
          bestTotalTime,
        };
      });

    if (category === 'fragments') {
      formatted.sort((a, b) => b.fragmentsCount - a.fragmentsCount || b.totalScore - a.totalScore);
    } else if (category === 'time') {
      formatted.sort((a, b) => {
        if (b.completedCount !== a.completedCount) return b.completedCount - a.completedCount;
        if (a.bestTotalTime === null) return 1;
        if (b.bestTotalTime === null) return -1;
        return a.bestTotalTime - b.bestTotalTime;
      });
    } else {
      formatted.sort((a, b) => b.totalScore - a.totalScore || b.fragmentsCount - a.fragmentsCount);
    }

    res.json({
      offline: false,
      category,
      entries: formatted.slice(0, 25).map((entry, idx) => ({
        rank: idx + 1,
        ...entry,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function getMyRank(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const mine = await GameProgress.findOne({ userId: req.userId }).lean();
    if (!mine) {
      res.json({ rank: null, totalScore: 0, fragmentsCount: 0 });
      return;
    }

    const higherCount = await GameProgress.countDocuments({
      totalScore: { $gt: mine.totalScore },
    });

    res.json({
      rank: higherCount + 1,
      totalScore: mine.totalScore,
      fragmentsCount: mine.collectedFragments.length,
      completedLevels: mine.completedLevels.length,
    });
  } catch (err) {
    next(err);
  }
}

export async function getTopGhostReplay(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const levelNumber = Number(req.query.level);
    if (!Number.isInteger(levelNumber) || levelNumber < 1 || levelNumber > 5) {
      res.status(400).json({ error: 'Valid level query parameter (1-5) is required' });
      return;
    }

    if (!isDatabaseConnected()) {
      res.json({ offline: true, ghost: null });
      return;
    }

    const fastest = await Ghost.findOne({ levelNumber })
      .sort({ timeSeconds: 1 })
      .lean();

    if (!fastest) {
      res.json({ offline: false, ghost: null });
      return;
    }

    res.json({
      offline: false,
      ghost: {
        levelNumber: fastest.levelNumber,
        username: fastest.username,
        timeSeconds: fastest.timeSeconds,
        data: fastest.data,
      },
    });
  } catch (err) {
    next(err);
  }
}
