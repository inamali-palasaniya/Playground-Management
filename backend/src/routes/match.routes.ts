import { Router } from 'express';
import {
    createMatch,
    getMatches,
    getMatchById,
    updateMatch,
    recordBallEvent,
    getLiveScore,
    undoLastBall,
    deleteMatch,
    getMatchStats
} from '../controllers/match.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { checkPermission } from '../middleware/permission.middleware.js';

const router = Router();

router.post('/', authenticateToken, checkPermission('cricket_scoring', 'add'), createMatch);
router.get('/', authenticateToken, checkPermission('cricket_scoring', 'view'), getMatches);
router.get('/:id', authenticateToken, checkPermission('cricket_scoring', 'view'), getMatchById);
router.put('/:id', authenticateToken, checkPermission('cricket_scoring', 'edit'), updateMatch); 
router.put('/:id/status', authenticateToken, checkPermission('cricket_scoring', 'edit'), updateMatch);
router.post('/:id/ball-event', authenticateToken, checkPermission('cricket_scoring', 'edit'), recordBallEvent);
router.get('/:id/live-score', getLiveScore); // Publicly viewable? For now, allowing without separate permission if auth exists.
router.delete('/:id/undo', authenticateToken, checkPermission('cricket_scoring', 'edit'), undoLastBall);
router.delete('/:id', authenticateToken, checkPermission('cricket_scoring', 'delete'), deleteMatch);

// Analytics
router.get('/:id/stats', authenticateToken, checkPermission('cricket_scoring', 'view'), getMatchStats);

export default router;
