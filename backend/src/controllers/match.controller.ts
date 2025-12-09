import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { processBallEvent } from '../services/scoring.service';

// Match CRUD
export const createMatch = async (req: Request, res: Response) => {
    try {
        const { tournament_id, team_a_id, team_b_id, start_time, overs } = req.body;

      if (!tournament_id || !team_a_id || !team_b_id || !start_time) {
          return res.status(400).json({ error: 'Tournament, teams, and start time are required' });
      }

      const match = await prisma.match.create({
          data: {
            tournament_id: parseInt(tournament_id),
            team_a_id: parseInt(team_a_id),
            team_b_id: parseInt(team_b_id),
            start_time: new Date(start_time),
            overs: overs ? parseInt(overs) : 20,
            status: 'SCHEDULED',
        },
        include: {
            tournament: true,
            team_a: {
                include: {
                    players: {
                        include: {
                            user: { select: { id: true, name: true } },
                        },
                    },
                },
            },
            team_b: {
                include: {
                    players: {
                        include: {
                            user: { select: { id: true, name: true } },
                        },
                    },
                },
            },
        },
    });

      res.status(201).json(match);
  } catch (error) {
      console.error('Error creating match:', error);
        res.status(500).json({ error: 'Failed to create match', details: error instanceof Error ? error.message : String(error) });
  }
};

export const getMatches = async (req: Request, res: Response) => {
    try {
      const { tournament_id, status } = req.query;

      const where: any = {};
      if (tournament_id) where.tournament_id = parseInt(tournament_id as string);
      if (status) where.status = status;

      const matches = await prisma.match.findMany({
        where,
        include: {
          tournament: true,
          team_a: true,
          team_b: true,
        },
        orderBy: { start_time: 'desc' },
    });

      res.json(matches);
  } catch (error) {
      console.error('Error fetching matches:', error);
        res.status(500).json({ error: 'Failed to fetch matches', details: error instanceof Error ? error.message : String(error) });
  }
};

export const getMatchById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

      const match = await prisma.match.findUnique({
        where: { id: parseInt(id) },
        include: {
            tournament: true,
            team_a: {
                include: {
                    players: {
                        include: {
                            user: { select: { id: true, name: true } },
                        },
                    },
                },
            },
            team_b: {
                include: {
                    players: {
                        include: {
                            user: { select: { id: true, name: true } },
                        },
                    },
                },
            },
            ball_events: {
                include: {
                    bowler: { select: { id: true, name: true } },
                    striker: { select: { id: true, name: true } },
                },
                orderBy: [{ over_number: 'asc' }, { ball_number: 'asc' }],
            },
        },
    });

      if (!match) {
          return res.status(404).json({ error: 'Match not found' });
      }

      res.json(match);
  } catch (error) {
      console.error('Error fetching match:', error);
      res.status(500).json({ error: 'Failed to fetch match' });
  }
};

export const updateMatchStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const match = await prisma.match.update({
            where: { id: parseInt(id) },
            data: { status },
        });

        res.json(match);
    } catch (error) {
        console.error('Error updating match status:', error);
        res.status(500).json({ error: 'Failed to update match status' });
    }
};

// Ball Event Recording
export const recordBallEvent = async (req: Request, res: Response) => {
    try {
        const {
            match_id,
            over_number,
            ball_number,
            bowler_id,
            striker_id,
            runs_scored,
            is_wicket,
            wicket_type,
            extras,
            extra_type,
        } = req.body;

        if (!match_id || over_number === undefined || ball_number === undefined || !bowler_id || !striker_id) {
            return res.status(400).json({ error: 'Required fields missing' });
        }

        const ballEvent = await processBallEvent({
            matchId: parseInt(match_id),
            overNumber: parseInt(over_number),
            ballNumber: parseInt(ball_number),
            bowlerId: parseInt(bowler_id),
            strikerId: parseInt(striker_id),
            runsScored: runs_scored ? parseInt(runs_scored) : 0,
            isWicket: is_wicket || false,
            wicketType: wicket_type || undefined,
            extras: extras ? parseInt(extras) : 0,
            extraType: extra_type || undefined,
        });

        res.status(201).json(ballEvent);
    } catch (error) {
        console.error('Error recording ball event:', error);
        res.status(500).json({ error: 'Failed to record ball event' });
    }
};

// Get Live Score
export const getLiveScore = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const match = await prisma.match.findUnique({
            where: { id: parseInt(id) },
            include: {
                ball_events: true,
            },
        });

        if (!match) {
            return res.status(404).json({ error: 'Match not found' });
        }

        // Calculate score
        const totalRuns = match.ball_events.reduce((sum, ball) => sum + ball.runs_scored + ball.extras, 0);
        const totalWickets = match.ball_events.filter(ball => ball.is_wicket).length;
        const totalBalls = match.ball_events.length;
        const overs = Math.floor(totalBalls / 6) + (totalBalls % 6) / 10;

        res.json({
            match_id: match.id,
            status: match.status,
            runs: totalRuns,
            wickets: totalWickets,
            overs: overs.toFixed(1),
            balls: totalBalls,
        });
    } catch (error) {
        console.error('Error getting live score:', error);
        res.status(500).json({ error: 'Failed to get live score' });
    }
};
