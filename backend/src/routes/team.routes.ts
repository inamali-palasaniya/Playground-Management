import { Router } from 'express';
import { createTeam, getTeams, getTeam, updateTeam, addPlayer, removePlayer, deleteTeam } from '../controllers/team.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { checkPermission } from '../middleware/permission.middleware.js';

const router = Router();

router.post('/', authenticateToken, checkPermission('cricket_scoring', 'add'), createTeam);
router.get('/', authenticateToken, checkPermission('cricket_scoring', 'view'), getTeams);
router.get('/:id', authenticateToken, checkPermission('cricket_scoring', 'view'), getTeam);
router.delete('/:id', authenticateToken, checkPermission('cricket_scoring', 'delete'), deleteTeam);
router.put('/:id', authenticateToken, checkPermission('cricket_scoring', 'edit'), updateTeam);

router.post('/:id/players', authenticateToken, checkPermission('cricket_scoring', 'edit'), addPlayer);
router.delete('/:id/players/:userId', authenticateToken, checkPermission('cricket_scoring', 'edit'), removePlayer);

export default router;
