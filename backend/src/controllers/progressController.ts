import { Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import {
  calculateAuthoritativeScore,
  getOrCreateProgress,
  sanitizeFragmentList,
  sanitizeLevelArray,
  serializeProgress,
  syncEligibleAchievements,
} from '../services/progressService';

export async function getProgress(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const progress = await getOrCreateProgress(req.userId!);
    res.json({ progress: serializeProgress(progress) });
  } catch (err) {
    next(err);
  }
}

export async function saveProgress(
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

    const progress = await getOrCreateProgress(req.userId!);
    const {
      currentLevel,
      collectedFragments,
      completedLevels,
      totalPlaytimeDelta,
      pulsesEmittedDelta,
      checkpoint,
      secretsDiscovered,
      doorsOpenedDelta,
      noAlertCompletedLevels,
      mergeMode,
    } = req.body as {
      currentLevel?: number;
      collectedFragments?: string[];
      completedLevels?: number[];
      totalPlaytimeDelta?: number;
      pulsesEmittedDelta?: number;
      checkpoint?: { level: number; x: number; y: number; z: number } | null;
      secretsDiscovered?: number[];
      doorsOpenedDelta?: number;
      noAlertCompletedLevels?: number[];
      mergeMode?: boolean;
    };

    // Merge fragments cleanly (never wipe previously earned fragments)
    const incomingFragments = sanitizeFragmentList(collectedFragments);
    const mergedFragments = new Set([...progress.collectedFragments, ...incomingFragments]);
    progress.collectedFragments = Array.from(mergedFragments);

    // Merge completed levels only if explicitly migrating or keeping monotonic progression
    if (mergeMode && Array.isArray(completedLevels)) {
      const mergedLevels = new Set([...progress.completedLevels, ...sanitizeLevelArray(completedLevels)]);
      progress.completedLevels = Array.from(mergedLevels).sort((a, b) => a - b);
    }

    if (typeof currentLevel === 'number' && currentLevel >= 1 && currentLevel <= 5) {
      progress.currentLevel = mergeMode ? Math.max(progress.currentLevel, currentLevel) : currentLevel;
    }

    if (typeof totalPlaytimeDelta === 'number' && totalPlaytimeDelta > 0 && totalPlaytimeDelta <= 7200) {
      progress.totalPlaytime = Math.round(progress.totalPlaytime + totalPlaytimeDelta);
    }

    if (typeof pulsesEmittedDelta === 'number' && pulsesEmittedDelta > 0 && pulsesEmittedDelta <= 5000) {
      progress.pulsesEmitted += Math.round(pulsesEmittedDelta);
    }

    if (typeof doorsOpenedDelta === 'number' && doorsOpenedDelta > 0 && doorsOpenedDelta <= 100) {
      progress.doorsOpenedCount = (progress.doorsOpenedCount ?? 0) + Math.round(doorsOpenedDelta);
    }

    if (mergeMode && Array.isArray(noAlertCompletedLevels)) {
      const mergedNoAlert = new Set([
        ...(progress.noAlertCompletedLevels ?? []),
        ...sanitizeLevelArray(noAlertCompletedLevels),
      ]);
      progress.noAlertCompletedLevels = Array.from(mergedNoAlert).sort((a, b) => a - b);
    }

    if (Array.isArray(secretsDiscovered)) {
      const mergedSecrets = new Set([...progress.secretsDiscovered, ...sanitizeLevelArray(secretsDiscovered)]);
      progress.secretsDiscovered = Array.from(mergedSecrets);
    }

    if (checkpoint !== undefined) {
      if (checkpoint === null) {
        progress.checkpoint = null;
      } else if (
        typeof checkpoint.level === 'number' &&
        checkpoint.level >= 1 &&
        checkpoint.level <= 5 &&
        Number.isFinite(checkpoint.x) &&
        Number.isFinite(checkpoint.y) &&
        Number.isFinite(checkpoint.z)
      ) {
        progress.checkpoint = {
          level: checkpoint.level,
          x: checkpoint.x,
          y: checkpoint.y,
          z: checkpoint.z,
        };
      }
    }

    progress.totalScore = calculateAuthoritativeScore(
      progress.completedLevels,
      progress.collectedFragments,
      progress.bestCompletionTimes
    );

    await progress.save();
    const newlyUnlocked = await syncEligibleAchievements(req.userId!, progress);

    res.json({
      progress: serializeProgress(progress),
      newlyUnlockedAchievements: newlyUnlocked,
    });
  } catch (err) {
    next(err);
  }
}

export async function completeLevel(
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
      level,
      completionTimeSeconds,
      collectedFragments,
      pulsesEmittedDelta,
      secretsDiscovered,
      doorsOpenedDelta,
      noAlertClear,
      hintsUsedDelta,
    } = req.body as {
      level: number;
      completionTimeSeconds: number;
      collectedFragments?: string[];
      pulsesEmittedDelta?: number;
      secretsDiscovered?: number[];
      doorsOpenedDelta?: number;
      noAlertClear?: boolean;
      hintsUsedDelta?: number;
    };

    // Basic anti-cheat sanity bounds (minimum realistic level completion >= 6s)
    if (completionTimeSeconds < 6 || completionTimeSeconds > 86400) {
      res.status(400).json({ error: 'Invalid completion time submitted' });
      return;
    }

    const progress = await getOrCreateProgress(req.userId!);

    const incomingFragments = sanitizeFragmentList(collectedFragments);
    progress.collectedFragments = Array.from(
      new Set([...progress.collectedFragments, ...incomingFragments])
    );

    if (!progress.completedLevels.includes(level)) {
      progress.completedLevels = [...progress.completedLevels, level].sort((a, b) => a - b);
    }

    const prevBest = progress.bestCompletionTimes.get(String(level));
    const roundedTime = Math.round(completionTimeSeconds);
    if (prevBest === undefined || roundedTime < prevBest) {
      progress.bestCompletionTimes.set(String(level), roundedTime);
    }

    if (typeof pulsesEmittedDelta === 'number' && pulsesEmittedDelta > 0 && pulsesEmittedDelta <= 5000) {
      progress.pulsesEmitted += Math.round(pulsesEmittedDelta);
    }

    if (typeof doorsOpenedDelta === 'number' && doorsOpenedDelta > 0 && doorsOpenedDelta <= 100) {
      progress.doorsOpenedCount = (progress.doorsOpenedCount ?? 0) + Math.round(doorsOpenedDelta);
    }

    if (noAlertClear) {
      const prevNoAlert = progress.noAlertCompletedLevels ?? [];
      if (!prevNoAlert.includes(level)) {
        progress.noAlertCompletedLevels = [...prevNoAlert, level].sort((a, b) => a - b);
      }
    }

    if (typeof hintsUsedDelta === 'number' && hintsUsedDelta > 0 && hintsUsedDelta <= 100) {
      progress.hintsUsedTotal = (progress.hintsUsedTotal ?? 0) + Math.round(hintsUsedDelta);
    }

    if (Array.isArray(secretsDiscovered)) {
      progress.secretsDiscovered = Array.from(
        new Set([...progress.secretsDiscovered, ...sanitizeLevelArray(secretsDiscovered)])
      );
    }

    progress.totalPlaytime = Math.round(progress.totalPlaytime + roundedTime);
    progress.currentLevel = Math.min(5, Math.max(progress.currentLevel, level + 1));
    progress.checkpoint = null;

    progress.totalScore = calculateAuthoritativeScore(
      progress.completedLevels,
      progress.collectedFragments,
      progress.bestCompletionTimes
    );

    await progress.save();
    const newlyUnlocked = await syncEligibleAchievements(req.userId!, progress);

    res.json({
      progress: serializeProgress(progress),
      newlyUnlockedAchievements: newlyUnlocked,
    });
  } catch (err) {
    next(err);
  }
}

export async function submitGhostReplay(
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

    const { levelNumber, timeSeconds, data } = req.body as {
      levelNumber: number;
      timeSeconds: number;
      data: string;
    };

    const { validateGhostReplayData } = await import('../services/ghostService');
    const validation = validateGhostReplayData(timeSeconds, data);
    if (!validation.valid) {
      res.status(400).json({ error: validation.reason || 'Invalid ghost replay data' });
      return;
    }

    const { Ghost } = await import('../models/Ghost');
    const { User } = await import('../models/User');
    const user = await User.findById(req.userId).select('username').lean();
    const username = user?.username ?? 'Explorer';

    const existing = await Ghost.findOne({ userId: req.userId, levelNumber });
    const roundedTime = Math.round(timeSeconds * 10) / 10;
    if (existing && existing.timeSeconds <= roundedTime) {
      res.json({ saved: false, improved: false, timeSeconds: existing.timeSeconds });
      return;
    }

    await Ghost.findOneAndUpdate(
      { userId: req.userId, levelNumber },
      {
        $set: {
          username,
          timeSeconds: roundedTime,
          frameCount: validation.frameCount,
          data,
        },
      },
      { upsert: true, new: true }
    );

    res.status(201).json({ saved: true, improved: true, timeSeconds: roundedTime });
  } catch (err) {
    next(err);
  }
}
