import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, VALID_AVATARS } from '../models/User';
import { AuthenticatedRequest, getJwtSecret } from '../middleware/authMiddleware';
import { getOrCreateProgress, serializeProgress } from '../services/progressService';

function signToken(userId: string): string {
  const expiresIn = (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'];
  return jwt.sign({ sub: userId }, getJwtSecret(), { expiresIn });
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: errors.array()[0].msg });
      return;
    }

    const { username, email, password, avatar } = req.body as {
      username: string;
      email: string;
      password: string;
      avatar?: string;
    };

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail }).lean();
    if (existing) {
      res.status(409).json({ error: 'An account with that email already exists' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const chosenAvatar =
      avatar && (VALID_AVATARS as readonly string[]).includes(avatar) ? avatar : 'cyan-seeker';

    const user = await User.create({
      username: username.trim(),
      email: normalizedEmail,
      passwordHash,
      avatar: chosenAvatar,
    });

    const progress = await getOrCreateProgress(user._id);
    const token = signToken(String(user._id));

    res.status(201).json({
      token,
      user: {
        id: String(user._id),
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        createdAt: user.createdAt,
      },
      progress: serializeProgress(progress),
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: errors.array()[0].msg });
      return;
    }

    const { email, password } = req.body as { email: string; password: string };
    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const progress = await getOrCreateProgress(user._id);
    const token = signToken(String(user._id));

    res.json({
      token,
      user: {
        id: String(user._id),
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        createdAt: user.createdAt,
      },
      progress: serializeProgress(progress),
    });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await User.findById(req.userId).lean();
    if (!user) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }
    const progress = await getOrCreateProgress(user._id);
    res.json({
      user: {
        id: String(user._id),
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        createdAt: user.createdAt,
      },
      progress: serializeProgress(progress),
    });
  } catch (err) {
    next(err);
  }
}
