import { Router } from 'express';
import { body } from 'express-validator';
import { register, login, getMe } from '../controllers/authController';
import { requireAuth, requireDatabase } from '../middleware/authMiddleware';
import { authRateLimiter } from '../middleware/rateLimiter';
import { VALID_AVATARS } from '../models/User';

const router = Router();

router.post(
  '/register',
  authRateLimiter,
  requireDatabase,
  [
    body('username')
      .isString()
      .trim()
      .isLength({ min: 3, max: 24 })
      .withMessage('Username must be 3–24 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password')
      .isString()
      .isLength({ min: 8, max: 128 })
      .withMessage('Password must be at least 8 characters'),
    body('avatar')
      .optional()
      .isIn([...VALID_AVATARS])
      .withMessage('Invalid avatar selection'),
  ],
  register
);

router.post(
  '/login',
  authRateLimiter,
  requireDatabase,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isString().notEmpty().withMessage('Password is required'),
  ],
  login
);

router.get('/me', requireDatabase, requireAuth, getMe);

export default router;
