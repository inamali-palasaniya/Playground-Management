import { Router } from 'express';
import { createTeam, getTeams, getTeam, addPlayer, removePlayer, deleteTeam } from '../controllers/team.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/', authenticateToken, createTeam);
router.get('/', authenticateToken, getTeams);
router.get('/:id', authenticateToken, getTeam);
router.delete('/:id', authenticateToken, deleteTeam);

router.post('/:id/players', authenticateToken, addPlayer);
router.delete('/:id/players/:userId', authenticateToken, removePlayer);

export default router;
