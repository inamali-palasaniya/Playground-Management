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

const router = Router();

// Tournament routes
router.get('/', getTournaments);
router.get('/:id', getTournamentById);
router.post('/', createTournament);
router.put('/:id', updateTournament);
router.delete('/:id', deleteTournament);

// Points Table & Stats
router.get('/:tournamentId/points-table', getPointsTable);
router.get('/:tournamentId/stats', getTournamentStats);

// Team routes
router.get('/:tournamentId/teams', getTeamsByTournament);
router.post('/:tournamentId/teams', createTeam);
router.put('/teams/:teamId', updateTeam);
router.delete('/teams/:teamId', deleteTeam);

// Player assignment
router.post('/teams/:teamId/players', addPlayerToTeam);
router.delete('/teams/:teamId/players/:playerId', removePlayerFromTeam);

// Awards
router.put('/:id/awards', setManOfTheSeries);

export default router;
