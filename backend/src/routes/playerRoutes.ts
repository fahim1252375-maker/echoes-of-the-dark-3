import { Router } from 'express';
import { body } from 'express-validator';
import { getProfile, updateProfile } from '../controllers/playerController';
import { requireAuth, requireDatabase } from '../middleware/authMiddleware';
import { VALID_AVATARS } from '../models/User';

const router = Router();

router.get('/profile', requireDatabase, requireAuth, getProfile);

router.patch(
  '/profile',
  requireDatabase,
  requireAuth,
  [
    body('username')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 3, max: 24 })
      .withMessage('Username must be 3–24 characters'),
    body('avatar')
      .optional()
      .isIn([...VALID_AVATARS])
      .withMessage('Invalid avatar selection'),
  ],
  updateProfile
);

export default router;
