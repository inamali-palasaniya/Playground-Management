import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';

// Create Team
export const createTeam = async (req: Request, res: Response) => {
    try {
        const { name, tournament_id } = req.body;

        if (!name || !tournament_id) {
            return res.status(400).json({ error: 'Name and tournament_id are required' });
        }

        // Validate Tournament
        const tournament = await prisma.tournament.findUnique({ where: { id: Number(tournament_id) } });
        if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

        const team = await prisma.team.create({
            data: {
                name,
                tournament_id: Number(tournament_id)
            },
            include: {
                players: true
            }
        });

        res.status(201).json(team);
    } catch (error) {
        console.error('Error creating team:', error);
        res.status(500).json({ error: 'Failed to create team' });
    }
};

// Get Teams (optionally by tournament)
export const getTeams = async (req: Request, res: Response) => {
    try {
        const { tournament_id } = req.query;
        const where: any = {};
        if (tournament_id) where.tournament_id = Number(tournament_id);

        const teams = await prisma.team.findMany({
            where,
            include: {
                _count: { select: { players: true } }
            }
        });

        res.json(teams);
    } catch (error) {
        console.error('Error fetching teams:', error);
        res.status(500).json({ error: 'Failed to fetch teams' });
    }
};

// Get Single Team
export const getTeam = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const team = await prisma.team.findUnique({
            where: { id: Number(id) },
            include: {
                players: {
                    include: {
                        user: {
                            select: { id: true, name: true, role: true, user_type: true }
                        }
                    }
                },
                tournament: true
            }
        });

        if (!team) return res.status(404).json({ error: 'Team not found' });
        res.json(team);
    } catch (error) {
        console.error('Error fetching team:', error);
        res.status(500).json({ error: 'Failed to fetch team' });
    }
};

// Add Player to Team
export const addPlayer = async (req: Request, res: Response) => {
    try {
        const { id } = req.params; // Team ID
        const { user_id } = req.body;

        if (!user_id) return res.status(400).json({ error: 'user_id is required' });

        // Check if user exists
        const user = await prisma.user.findUnique({ where: { id: Number(user_id) } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Check compatibility (e.g. is user already in another team in same tournament? - optional constraint)

        const teamPlayer = await prisma.teamPlayer.create({
            data: {
                team_id: Number(id),
                user_id: Number(user_id)
            }
        });

        res.status(201).json(teamPlayer);

    } catch (error) {
        console.error('Error adding player:', error);
        res.status(500).json({ error: 'Failed to add player' });
    }
};

// Remove Player from Team
export const removePlayer = async (req: Request, res: Response) => {
    try {
        const { id, userId } = req.params; // Team ID, User ID

        // Find TeamPlayer record ID
        const teamPlayer = await prisma.teamPlayer.findFirst({
            where: {
                team_id: Number(id),
                user_id: Number(userId)
            }
        });

        if (!teamPlayer) return res.status(404).json({ error: 'Player not found in this team' });

        await prisma.teamPlayer.delete({
            where: { id: teamPlayer.id }
        });

        res.json({ message: 'Player removed' });
    } catch (error) {
        console.error('Error removing player:', error);
        res.status(500).json({ error: 'Failed to remove player' });
    }
};

// Delete Team
export const deleteTeam = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.team.delete({ where: { id: Number(id) } });
        res.json({ message: 'Team deleted' });
    } catch (error) {
        console.error('Error deleting team:', error);
        res.status(500).json({ error: 'Failed to delete team' });
    }
};
