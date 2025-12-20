import { Router } from 'express';
import {
    createMatch,
    getMatches,
    getMatchById,
    updateMatch,
    recordBallEvent,
    getLiveScore,
    undoLastBall,
    deleteMatch
} from '../controllers/match.controller.js';

import {
    setManOfTheMatch,
    getMatchStats
} from '../controllers/match-analytics.controller.js';

const router = Router();

router.post('/', createMatch);
router.get('/', getMatches);
router.get('/:id', getMatchById);
router.put('/:id', updateMatch); // Generic update
router.put('/:id/status', updateMatch); // Legacy support
router.post('/:id/ball-event', recordBallEvent);
router.get('/:id/live-score', getLiveScore);
router.delete('/:id/undo', undoLastBall);
router.delete('/:id', deleteMatch);

// Analytics
router.put('/:id/awards', setManOfTheMatch);
router.get('/:id/stats', getMatchStats);

export default router;
