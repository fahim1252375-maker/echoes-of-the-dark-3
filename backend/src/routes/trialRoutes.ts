import { Router } from 'express';
import { body } from 'express-validator';
import { completeTrialRun, getDailyTrial } from '../controllers/trialController';
import { optionalAuth } from '../middleware/authMiddleware';

const router = Router();

router.get('/daily', getDailyTrial);

router.post(
  '/complete',
  optionalAuth,
  [
    body('seed').isInt({ min: 1, max: 4294967295 }).withMessage('Valid trial seed required'),
    body('difficulty')
      .isIn(['Novice', 'Explorer', 'Expert'])
      .withMessage('Valid difficulty required'),
    body('isDaily').optional().isBoolean(),
    body('completionTimeSeconds')
      .isFloat({ min: 8, max: 86400 })
      .withMessage('Valid completionTimeSeconds (>= 8s) required'),
    body('fragmentsCollected').optional().isInt({ min: 0, max: 12 }),
    body('pulsesUsed').optional().isInt({ min: 0, max: 5000 }),
  ],
  completeTrialRun
);

export default router;
