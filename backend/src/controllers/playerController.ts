import { Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { User, VALID_AVATARS } from '../models/User';
import { Achievement } from '../models/Achievement';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import {
  ACHIEVEMENT_CATALOG,
  getOrCreateProgress,
  serializeProgress,
} from '../services/progressService';

export async function getProfile(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = await User.findById(req.userId).lean();
    if (!user) {
      res.status(404).json({ error: 'Player profile not found' });
      return;
    }
    const progress = await getOrCreateProgress(user._id);
    const achievements = await Achievement.find({ userId: user._id }).lean();

    res.json({
      user: {
        id: String(user._id),
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        createdAt: user.createdAt,
      },
      progress: serializeProgress(progress),
      achievements: achievements.map((a) => ({
        ...ACHIEVEMENT_CATALOG[a.achievementId as keyof typeof ACHIEVEMENT_CATALOG],
        unlockedAt: a.unlockedAt,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(
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

    const updates: Record<string, string> = {};
    if (typeof req.body.username === 'string') {
      updates.username = req.body.username.trim();
    }
    if (
      typeof req.body.avatar === 'string' &&
      (VALID_AVATARS as readonly string[]).includes(req.body.avatar)
    ) {
      updates.avatar = req.body.avatar;
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { $set: updates },
      { new: true, runValidators: true }
    ).lean();

    if (!user) {
      res.status(404).json({ error: 'Player profile not found' });
      return;
    }

    res.json({
      user: {
        id: String(user._id),
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
}
