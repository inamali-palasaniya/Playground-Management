import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';

// Tournament CRUD
export const getTournaments = async (req: Request, res: Response) => {
  try {
    const tournaments = await prisma.tournament.findMany({
      include: {
        game: true,
        teams: {
          include: {
            players: {
              include: {
                user: {
                  select: { id: true, name: true, phone: true },
                },
              },
            },
          },
        },
        created_by: { select: { name: true } },
      },
      orderBy: { start_date: 'desc' },
    });
    res.json(tournaments);
  } catch (error) {
    console.error('Error fetching tournaments:', error);
    res.status(500).json({ error: 'Failed to fetch tournaments' });
  }
};

export const getTournamentById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tournament = await prisma.tournament.findUnique({
      where: { id: parseInt(id) },
      include: {
        game: true,
        teams: {
          include: {
            players: {
              include: {
                user: {
                  select: { id: true, name: true, phone: true },
                },
              },
            },
          },
        },
        matches: true,
      },
    });

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    res.json(tournament);
  } catch (error) {
    console.error('Error fetching tournament:', error);
    res.status(500).json({ error: 'Failed to fetch tournament' });
  }
};

export const createTournament = async (req: Request, res: Response) => {
  try {
    const { name, game_id, start_date, end_date } = req.body;

    if (!name || !game_id || !start_date) {
      return res.status(400).json({ error: 'Name, game ID, and start date are required' });
    }

    const tournament = await prisma.tournament.create({
      data: {
        name,
        game_id: parseInt(game_id),
        start_date: new Date(start_date),
        end_date: end_date ? new Date(end_date) : null,
        created_by_id: (req as any).user?.userId || null,
      },
      include: {
        game: true,
      },
    });

    res.status(201).json(tournament);
  } catch (error) {
    console.error('Error creating tournament:', error);
    res.status(500).json({ error: 'Failed to create tournament' });
  }
};

export const updateTournament = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, start_date, end_date } = req.body;

    const tournament = await prisma.tournament.update({
      where: { id: parseInt(id) },
      data: {
        name,
        start_date: start_date ? new Date(start_date) : undefined,
        end_date: end_date ? new Date(end_date) : undefined,
      },
      include: {
        game: true,
      },
    });

    res.json(tournament);
  } catch (error) {
    console.error('Error updating tournament:', error);
    res.status(500).json({ error: 'Failed to update tournament' });
  }
};

export const deleteTournament = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.tournament.delete({
      where: { id: parseInt(id) },
    });

    res.json({ message: 'Tournament deleted successfully' });
  } catch (error) {
    console.error('Error deleting tournament:', error);
    res.status(500).json({ error: 'Failed to delete tournament' });
  }
};

// Team Management
export const getTeamsByTournament = async (req: Request, res: Response) => {
  try {
    const { tournamentId } = req.params;

    const teams = await prisma.team.findMany({
      where: { tournament_id: parseInt(tournamentId) },
      include: {
        players: {
          include: {
            user: {
              select: { id: true, name: true, phone: true },
            },
          },
        },
      },
    });

    res.json(teams);
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
};

export const createTeam = async (req: Request, res: Response) => {
  try {
    const { tournamentId } = req.params;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Team name is required' });
    }

    const team = await prisma.team.create({
      data: {
        name,
        tournament_id: parseInt(tournamentId),
      },
    });

    res.status(201).json(team);
  } catch (error) {
    console.error('Error creating team:', error);
    res.status(500).json({ error: 'Failed to create team' });
  }
};

export const updateTeam = async (req: Request, res: Response) => {
  try {
    const { teamId } = req.params;
    const { name } = req.body;

    const team = await prisma.team.update({
      where: { id: parseInt(teamId) },
      data: { name },
    });

    res.json(team);
  } catch (error) {
    console.error('Error updating team:', error);
    res.status(500).json({ error: 'Failed to update team' });
  }
};

export const deleteTeam = async (req: Request, res: Response) => {
  try {
    const { teamId } = req.params;

    await prisma.team.delete({
      where: { id: parseInt(teamId) },
    });

    res.json({ message: 'Team deleted successfully' });
  } catch (error) {
    console.error('Error deleting team:', error);
    res.status(500).json({ error: 'Failed to delete team' });
  }
};

// Player Assignment
export const addPlayerToTeam = async (req: Request, res: Response) => {
  try {
    const { teamId } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const teamPlayer = await prisma.teamPlayer.create({
      data: {
        team_id: parseInt(teamId),
        user_id: parseInt(user_id),
      },
      include: {
        user: {
          select: { id: true, name: true, phone: true },
        },
      },
    });

    res.status(201).json(teamPlayer);
  } catch (error) {
    console.error('Error adding player to team:', error);
    res.status(500).json({ error: 'Failed to add player to team' });
  }
};

export const removePlayerFromTeam = async (req: Request, res: Response) => {
  try {
    const { teamId, playerId } = req.params;

    await prisma.teamPlayer.deleteMany({
      where: {
        team_id: parseInt(teamId),
        user_id: parseInt(playerId),
      },
    });

    res.json({ message: 'Player removed from team successfully' });
  } catch (error) {
    console.error('Error removing player from team:', error);
    res.status(500).json({ error: 'Failed to remove player from team' });
  }
};
