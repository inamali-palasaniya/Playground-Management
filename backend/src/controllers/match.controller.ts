import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const createMatch = async (req: Request, res: Response) => {
    try {
        const { tournament_id, team_a_id, team_b_id, start_time, overs } = req.body;
        const match = await prisma.match.create({
            data: {
                tournament_id,
                team_a_id,
                team_b_id,
                start_time: new Date(start_time),
                overs,
                status: 'SCHEDULED',
            },
        });
        res.status(201).json(match);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create match' });
    }
};

export const getMatches = async (req: Request, res: Response) => {
    try {
        const matches = await prisma.match.findMany({
            include: {
                team_a: true,
                team_b: true,
                tournament: true,
            },
            orderBy: { start_time: 'desc' },
        });
        res.json(matches);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch matches' });
    }
};

export const getMatchById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const match = await prisma.match.findUnique({
            where: { id: Number(id) },
            include: {
                team_a: { include: { players: { include: { user: true } } } },
                team_b: { include: { players: { include: { user: true } } } },
                ball_events: true,
            },
        });
        if (!match) {
            return res.status(404).json({ error: 'Match not found' });
        }
        res.json(match);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch match' });
    }
};
