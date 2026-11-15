import { Router } from 'express';
import { getLeaderboard, getMyRank, getTopGhostReplay } from '../controllers/leaderboardController';
import { requireAuth, requireDatabase } from '../middleware/authMiddleware';

const router = Router();

router.get('/', getLeaderboard);
router.get('/ghost', getTopGhostReplay);
router.get('/me', requireDatabase, requireAuth, getMyRank);

export default router;
