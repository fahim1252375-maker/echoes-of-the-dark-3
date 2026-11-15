import { Router } from 'express';
import { body } from 'express-validator';
import {
  postHint,
  postLore,
  postRecap,
  postTrialBlueprint,
  postTrialFromImage,
} from '../controllers/aiController';
import {
  aiHintRateLimiter,
  aiLoreRateLimiter,
  aiRecapRateLimiter,
  aiTrialRateLimiter,
  aiVisionTrialRateLimiter,
} from '../middleware/rateLimiter';

const router = Router();

router.post(
  '/lore',
  aiLoreRateLimiter,
  [
    body('trigger')
      .isIn(['statue', 'level_start', 'level_complete', 'death', 'secret_found'])
      .withMessage('Valid lore trigger is required'),
    body('levelNumber').isInt({ min: 1, max: 5 }).withMessage('Valid levelNumber (1-5) required'),
    body('levelName').isString().isLength({ min: 1, max: 80 }).withMessage('levelName required'),
    body('fragmentsCollected').optional().isInt({ min: 0, max: 30 }),
    body('pulsesUsed').optional().isInt({ min: 0, max: 9999 }),
    body('elapsedSeconds').optional().isFloat({ min: 0, max: 86400 }),
    body('deaths').optional().isInt({ min: 0, max: 999 }),
    body('statueInscription').optional().isString().isLength({ max: 200 }),
    body('language')
      .optional()
      .isIn(['en', 'bn', 'zh'])
      .withMessage('language must be en, bn, or zh'),
  ],
  postLore
);

router.post(
  '/hint',
  aiHintRateLimiter,
  [
    body('levelNumber').isInt({ min: 1, max: 5 }).withMessage('Valid levelNumber (1-5) required'),
    body('levelName').isString().isLength({ min: 1, max: 80 }).withMessage('levelName required'),
    body('fragmentsCollected').optional().isInt({ min: 0, max: 30 }),
    body('fragmentsMissing').optional().isInt({ min: 0, max: 30 }),
    body('mechanismsActivated').optional().isInt({ min: 0, max: 10 }),
    body('mechanismsRequired').optional().isInt({ min: 0, max: 10 }),
    body('secondsStuck').optional().isFloat({ min: 0, max: 86400 }),
    body('language')
      .optional()
      .isIn(['en', 'bn', 'zh'])
      .withMessage('language must be en, bn, or zh'),
  ],
  postHint
);

router.post(
  '/recap',
  aiRecapRateLimiter,
  [
    body('levelNumber').isInt({ min: 1, max: 5 }).withMessage('Valid levelNumber (1-5) required'),
    body('levelName').isString().isLength({ min: 1, max: 80 }).withMessage('levelName required'),
    body('completionTimeSeconds').isFloat({ min: 0, max: 86400 }).withMessage('Valid time required'),
    body('pulsesUsed').optional().isInt({ min: 0, max: 9999 }),
    body('deaths').optional().isInt({ min: 0, max: 999 }),
    body('fragmentsCollected').optional().isInt({ min: 0, max: 30 }),
    body('hintsUsed').optional().isInt({ min: 0, max: 99 }),
    body('medal').optional({ values: 'null' }).isIn(['gold', 'silver', 'bronze']),
    body('language')
      .optional()
      .isIn(['en', 'bn', 'zh'])
      .withMessage('language must be en, bn, or zh'),
  ],
  postRecap
);

router.post(
  '/trial',
  aiTrialRateLimiter,
  [
    body('seed').optional().isInt({ min: 1, max: 4294967295 }),
    body('difficulty')
      .optional()
      .isIn(['Novice', 'Explorer', 'Expert'])
      .withMessage('Difficulty must be Novice, Explorer, or Expert'),
    body('themeHint').optional().isString().isLength({ max: 60 }),
  ],
  postTrialBlueprint
);

router.post(
  '/trial-from-image',
  aiVisionTrialRateLimiter,
  [
    body('imageBase64').isString().isLength({ min: 16, max: 3200000 }).withMessage('Valid imageBase64 payload required'),
    body('mimeType').optional().isIn(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']),
    body('difficulty')
      .optional()
      .isIn(['Novice', 'Explorer', 'Expert'])
      .withMessage('Difficulty must be Novice, Explorer, or Expert'),
  ],
  postTrialFromImage
);

export default router;
