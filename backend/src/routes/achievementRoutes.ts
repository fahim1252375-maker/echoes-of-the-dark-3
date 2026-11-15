import { Router } from 'express';
import { body } from 'express-validator';
import { getAchievements, unlockAchievement } from '../controllers/achievementController';
import { requireAuth, requireDatabase } from '../middleware/authMiddleware';
import { ACHIEVEMENT_IDS } from '../models/Achievement';

const router = Router();

router.get('/', requireDatabase, requireAuth, getAchievements);

router.post(
  '/unlock',
  requireDatabase,
  requireAuth,
  [
    body('achievementId')
      .isIn([...ACHIEVEMENT_IDS])
      .withMessage('Unknown achievement identifier'),
  ],
  unlockAchievement
);

export default router;
