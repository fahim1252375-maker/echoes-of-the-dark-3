import { Router } from 'express';
import { body } from 'express-validator';
import {
  getProgress,
  saveProgress,
  completeLevel,
  submitGhostReplay,
} from '../controllers/progressController';
import { requireAuth, requireDatabase } from '../middleware/authMiddleware';

const router = Router();

router.get('/', requireDatabase, requireAuth, getProgress);

router.post(
  '/save',
  requireDatabase,
  requireAuth,
  [
    body('currentLevel').optional().isInt({ min: 1, max: 5 }),
    body('collectedFragments').optional().isArray({ max: 30 }),
    body('completedLevels').optional().isArray({ max: 5 }),
    body('totalPlaytimeDelta').optional().isFloat({ min: 0, max: 7200 }),
    body('pulsesEmittedDelta').optional().isInt({ min: 0, max: 5000 }),
    body('secretsDiscovered').optional().isArray({ max: 5 }),
    body('doorsOpenedDelta').optional().isInt({ min: 0, max: 100 }),
    body('noAlertCompletedLevels').optional().isArray({ max: 5 }),
  ],
  saveProgress
);

router.post(
  '/complete-level',
  requireDatabase,
  requireAuth,
  [
    body('level').isInt({ min: 1, max: 5 }).withMessage('Valid stage level (1-5) is required'),
    body('completionTimeSeconds')
      .isFloat({ min: 6, max: 86400 })
      .withMessage('Valid completion time is required'),
    body('collectedFragments').optional().isArray({ max: 30 }),
    body('pulsesEmittedDelta').optional().isInt({ min: 0, max: 5000 }),
    body('secretsDiscovered').optional().isArray({ max: 5 }),
    body('doorsOpenedDelta').optional().isInt({ min: 0, max: 100 }),
    body('noAlertClear').optional().isBoolean(),
    body('hintsUsedDelta').optional().isInt({ min: 0, max: 100 }),
  ],
  completeLevel
);

router.post(
  '/ghost',
  requireDatabase,
  requireAuth,
  [
    body('levelNumber').isInt({ min: 1, max: 5 }).withMessage('Valid levelNumber (1-5) required'),
    body('timeSeconds').isFloat({ min: 6, max: 86400 }).withMessage('Valid timeSeconds required'),
    body('data').isString().isLength({ min: 10, max: 40960 }).withMessage('Valid base64 ghost data required'),
  ],
  submitGhostReplay
);

export default router;
