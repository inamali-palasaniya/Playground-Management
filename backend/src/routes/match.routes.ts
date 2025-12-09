import { Router } from 'express';
import {
    createMatch,
    getMatches,
    getMatchById,
    updateMatchStatus,
    recordBallEvent,
    getLiveScore,
} from '../controllers/match.controller.js';
import {
    setManOfTheMatch,
    getMatchStats
} from '../controllers/match-analytics.controller.js';

const router = Router();

router.post('/', createMatch);
router.get('/', getMatches);
router.get('/:id', getMatchById);
router.put('/:id/status', updateMatchStatus);
router.post('/:id/ball-event', recordBallEvent);
router.get('/:id/live-score', getLiveScore);

// Analytics
router.put('/:id/awards', setManOfTheMatch);
router.get('/:id/stats', getMatchStats);

export default router;
