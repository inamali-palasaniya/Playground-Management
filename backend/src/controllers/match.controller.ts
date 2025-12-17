import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';
import { processBallEvent } from '../services/scoring.service.js';

// Match CRUD
export const createMatch = async (req: Request, res: Response) => {
    try {
        const { tournament_id, team_a_id, team_b_id, start_time, overs } = req.body;

        if (!team_a_id || !team_b_id || !start_time) {
            return res.status(400).json({ error: 'Teams and start time are required' });
        }

        const teamAId = parseInt(team_a_id);
        const teamBId = parseInt(team_b_id);

        // Verify Teams Exist
        const teamA = await prisma.team.findUnique({ where: { id: teamAId } });
        const teamB = await prisma.team.findUnique({ where: { id: teamBId } });

        if (!teamA || !teamB) {
            return res.status(404).json({ error: 'One or both teams not found' });
        }

        let finalTournamentId = tournament_id ? parseInt(tournament_id) : null;

        // FK Validation / Auto-Correction
        if (finalTournamentId) {
            const tournamentExists = await prisma.tournament.findUnique({ where: { id: finalTournamentId } });
            if (!tournamentExists) {
                return res.status(404).json({ error: 'Tournament not found' });
            }

            // Validate Teams belong to this tournament (optional but good practice)
            if (teamA.tournament_id !== finalTournamentId || teamB.tournament_id !== finalTournamentId) {
            // Warn or Block? For now, we allow cross-tournament games or just warn. 
            // Stricter: return res.status(400).json({ error: 'Teams must belong to the selected tournament' });
            }
        }

        if (!finalTournamentId) {
            // Find or Create Default Tournament
            let defaultTournament = await prisma.tournament.findFirst({
                where: { name: 'General Tournament' }
            });

            if (!defaultTournament) {
                // Ensure a Game exists first. Robust check.
                let defaultGame = await prisma.game.findFirst();
                if (!defaultGame) {
                    defaultGame = await prisma.game.create({ data: { name: 'Cricket' } });
                }

                defaultTournament = await prisma.tournament.create({
                    data: {
                        name: 'General Tournament',
                        game_id: defaultGame.id,
                        start_date: new Date(),
                    }
                });
            }
            finalTournamentId = defaultTournament.id;
      }

      const match = await prisma.match.create({
          data: {
              tournament_id: finalTournamentId,
              team_a_id: teamAId,
              team_b_id: teamBId,
            start_time: new Date(start_time),
            overs: overs ? parseInt(overs) : 20,
            status: 'SCHEDULED',
        },
        include: {
            tournament: true,
            team_a: { select: { id: true, name: true } },
            team_b: { select: { id: true, name: true } },
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

// Generic Match Update (Status, Toss, Result)
export const updateMatch = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const {
            status,
            toss_winner_id,
            toss_decision,
            winning_team_id,
            result_description,
            current_innings,
            is_completed
        } = req.body;

        const data: any = {};
        if (status) data.status = status;
        if (toss_winner_id) data.toss_winner_id = parseInt(toss_winner_id);
        if (toss_decision) data.toss_decision = toss_decision;
        if (winning_team_id) data.winning_team_id = parseInt(winning_team_id);
        if (result_description) data.result_description = result_description;
        if (current_innings) data.current_innings = parseInt(current_innings);
        if (is_completed !== undefined) data.is_completed = is_completed;

        const match = await prisma.match.update({
            where: { id: parseInt(id) },
            data,
        });

        res.json(match);
    } catch (error) {
        console.error('Error updating match:', error);
        res.status(500).json({ error: 'Failed to update match' });
    }
};

// Ball Event Recording
export const recordBallEvent = async (req: Request, res: Response) => {
    try {
        const {
            match_id,
            innings,
            over_number,
            ball_number,
            bowler_id,
            striker_id,
            non_striker_id,
            batting_team_id,
            runs_scored,
            is_wicket,
            wicket_type,
            extras,
            extra_type,
            is_valid_ball
        } = req.body;

        if (!match_id || over_number === undefined || ball_number === undefined || !bowler_id || !striker_id || !batting_team_id) {
            return res.status(400).json({ error: 'Required fields missing' });
        }

        const ballEvent = await processBallEvent({
            matchId: parseInt(match_id),
            innings: innings ? parseInt(innings) : 1,
            overNumber: parseInt(over_number),
            ballNumber: parseInt(ball_number),
            bowlerId: parseInt(bowler_id),
            strikerId: parseInt(striker_id),
            nonStrikerId: non_striker_id ? parseInt(non_striker_id) : 0, // 0 or handle null if optional
            battingTeamId: parseInt(batting_team_id),
            runsScored: runs_scored ? parseInt(runs_scored) : 0,
            isWicket: is_wicket || false,
            wicketType: wicket_type || undefined,
            extras: extras ? parseInt(extras) : 0,
            extraType: extra_type || undefined,
            isValidBall: is_valid_ball !== undefined ? is_valid_ball : true
        });

        res.status(201).json(ballEvent);
    } catch (error) {
        console.error('Error recording ball event:', error);
        res.status(500).json({ error: 'Failed to record ball event' });
    }
};

// Undo Last Ball
export const undoLastBall = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Find the last event
        const lastBall = await prisma.ballEvent.findFirst({
            where: { match_id: parseInt(id) },
            orderBy: { id: 'desc' }
        });

        if (!lastBall) {
            return res.status(404).json({ error: 'No balls to undo' });
        }

        // Delete it
        await prisma.ballEvent.delete({
            where: { id: lastBall.id }
        });

        res.json({ message: 'Last ball undone successfully' });

    } catch (error) {
        console.error('Error undoing last ball:', error);
        res.status(500).json({ error: 'Failed to undo last ball' });
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

        // Calculate score per innings
        const calculateInningsScore = (events: any[]) => {
            const runs = events.reduce((sum: number, ball: any) => sum + ball.runs_scored + ball.extras, 0);
            const wickets = events.filter((ball: any) => ball.is_wicket).length;
            const validBalls = events.filter((ball: any) => ball.extra_type !== 'WD' && ball.extra_type !== 'NB').length;
            const overs = Math.floor(validBalls / 6) + (validBalls % 6) / 10;
            return { runs, wickets, overs, balls: validBalls };
        };

        const innings1Events = match.ball_events.filter((b: any) => b.innings === 1);
        const innings2Events = match.ball_events.filter((b: any) => b.innings === 2);

        res.json({
            match_id: match.id,
            status: match.status,
            current_innings: match.current_innings || 1,
            score: {
                innings1: calculateInningsScore(innings1Events),
                innings2: calculateInningsScore(innings2Events)
            }
        });
    } catch (error) {
        console.error('Error getting live score:', error);
        res.status(500).json({ error: 'Failed to get live score' });
    }
};
