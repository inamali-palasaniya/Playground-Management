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
} from '../controllers/tournament.controller';

const router = Router();

// Tournament routes
router.get('/', getTournaments);
router.get('/:id', getTournamentById);
router.post('/', createTournament);
router.put('/:id', updateTournament);
router.delete('/:id', deleteTournament);

// Team routes
router.get('/:tournamentId/teams', getTeamsByTournament);
router.post('/:tournamentId/teams', createTeam);
router.put('/teams/:teamId', updateTeam);
router.delete('/teams/:teamId', deleteTeam);

// Player assignment
router.post('/teams/:teamId/players', addPlayerToTeam);
router.delete('/teams/:teamId/players/:playerId', removePlayerFromTeam);

export default router;
