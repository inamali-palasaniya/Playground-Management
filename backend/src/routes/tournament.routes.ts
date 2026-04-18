import { Router } from 'express';
import {
  getTournaments,
  getTournamentById,
  createTournament,
  updateTournament,
  deleteTournament,
  getTeamsByTournament,
  createTeam,
  updateTeam,
  deleteTeam,
  addPlayerToTeam,
  removePlayerFromTeam,
} from '../controllers/tournament.controller.js';
import { setManOfTheSeries, getPointsTable, getTournamentStats } from '../controllers/match-analytics.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { checkPermission } from '../middleware/permission.middleware.js';

const router = Router();
router.use(authenticateToken);

// Tournament routes
router.get('/', checkPermission('cricket_scoring', 'view'), getTournaments);
router.get('/:id', checkPermission('cricket_scoring', 'view'), getTournamentById);
router.post('/', checkPermission('cricket_scoring', 'add'), createTournament);
router.put('/:id', checkPermission('cricket_scoring', 'edit'), updateTournament);
router.delete('/:id', checkPermission('cricket_scoring', 'delete'), deleteTournament);

// Points Table & Stats
router.get('/:tournamentId/points-table', checkPermission('cricket_scoring', 'view'), getPointsTable);
router.get('/:tournamentId/stats', checkPermission('cricket_scoring', 'view'), getTournamentStats);

// Team routes
router.get('/:tournamentId/teams', checkPermission('cricket_scoring', 'view'), getTeamsByTournament);
router.post('/:tournamentId/teams', checkPermission('cricket_scoring', 'add'), createTeam); // Using add for team create
router.put('/teams/:teamId', checkPermission('cricket_scoring', 'edit'), updateTeam);
router.delete('/teams/:teamId', checkPermission('cricket_scoring', 'delete'), deleteTeam);

// Player assignment
router.post('/teams/:teamId/players', checkPermission('cricket_scoring', 'edit'), addPlayerToTeam);
router.delete('/teams/:teamId/players/:playerId', checkPermission('cricket_scoring', 'edit'), removePlayerFromTeam);

// Awards
router.put('/:id/awards', checkPermission('cricket_scoring', 'edit'), setManOfTheSeries);

export default router;
