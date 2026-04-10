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
                created_by_id: (req as any).user?.userId || null,
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
                created_by: { select: { name: true } },
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
            is_completed,
            current_striker_id,
            current_non_striker_id,
            current_bowler_id,
            current_batting_team_id,
            man_of_the_match_id,
            stats_req
        } = req.body;

        const data: any = {};
        if (status) data.status = status;
        if (toss_winner_id) data.toss_winner_id = Number(toss_winner_id);
        if (toss_decision) data.toss_decision = toss_decision;
        if (winning_team_id) data.winning_team_id = Number(winning_team_id);
        if (result_description) data.result_description = result_description;
        if (current_innings) data.current_innings = Number(current_innings);
        if (is_completed !== undefined) data.is_completed = is_completed;
        if (man_of_the_match_id) data.man_of_the_match_id = Number(man_of_the_match_id);

        if (current_striker_id) data.current_striker_id = Number(current_striker_id);
        if (current_non_striker_id) data.current_non_striker_id = Number(current_non_striker_id);
        if (current_bowler_id) data.current_bowler_id = Number(current_bowler_id);
        if (current_batting_team_id) data.current_batting_team_id = Number(current_batting_team_id);

        // Remove NaN values if any
        // Validations
        if (data.current_striker_id || data.current_non_striker_id || data.current_bowler_id) {
            const currentMatch = await prisma.match.findUnique({ where: { id: parseInt(id) } });
            if (currentMatch) {
                const sId = data.current_striker_id || currentMatch.current_striker_id;
                const nsId = data.current_non_striker_id || currentMatch.current_non_striker_id;
                const bId = data.current_bowler_id || currentMatch.current_bowler_id;
                const battingTeamId = data.current_batting_team_id || currentMatch.current_batting_team_id;

                if (sId && nsId && Number(sId) === Number(nsId)) {
                    return res.status(400).json({ error: 'Striker and Non-Striker cannot be the same player.' });
                }

                if (bId && battingTeamId) {
                    const bowlerInBattingTeam = await prisma.teamPlayer.findFirst({
                        where: {
                            team_id: battingTeamId,
                            user_id: bId
                        }
                    });
                    if (bowlerInBattingTeam) {
                        return res.status(400).json({ error: 'Bowler cannot be from the batting team.' });
                    }
                }
            }
        }

        const match = await prisma.match.update({
            where: { id: parseInt(id) },
            data,
        });

        res.json(match);

        // Emit update via Socket.IO
        try {
            const { getIO } = require('../server');
            const io = getIO();
            if (io) {
                io.to(`match_${id}`).emit('score_update', { type: 'UPDATE', matchId: id });
            }
        } catch (e) {
            console.error('Socket emit failed:', e);
        }
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
            nonStrikerId: non_striker_id ? parseInt(non_striker_id) : undefined, // Maps to null in Prisma if optional
            battingTeamId: parseInt(batting_team_id),
            runsScored: runs_scored ? parseInt(runs_scored) : 0,
            isWicket: is_wicket || false,
            wicketType: wicket_type || undefined,
            extras: extras ? parseInt(extras) : 0,
            extraType: extra_type || undefined,
            isValidBall: is_valid_ball !== undefined ? is_valid_ball : true
        });

        res.status(201).json(ballEvent);
        // Emit update via Socket.IO
        try {
            const { getIO } = require('../server');
            const io = getIO();
            if (io) {
                const room = `match_${match_id}`;
                console.log(`Emitting BALL update to ${room}`);
                io.to(room).emit('score_update', { type: 'BALL', data: ballEvent });
            }
        } catch (e) { console.error('Socket emit failed:', e); }
    } catch (error: any) {
        console.error('Error recording ball event:', error);
        res.status(500).json({
            error: error.message || 'Failed to record ball event',
            details: error.message
        });
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

        // Emit update via Socket.IO
        try {
            const { getIO } = require('../server');
            const io = getIO();
            if (io) {
                const room = `match_${id}`;
                console.log(`Emitting UNDO update to ${room}`);
                io.to(room).emit('score_update', { type: 'UNDO', matchId: id });
            }
        } catch (e) {
            console.error('Socket emit failed:', e);
        }

    } catch (error) {
        console.error('Error undoing last ball:', error);
        res.status(500).json({ error: 'Failed to undo last ball' });
    }
};

export const getLiveScore = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const matchId = parseInt(id);

        const match = await prisma.match.findUnique({
            where: { id: matchId },
            select: { id: true, status: true, current_innings: true, overs: true }
        });

        if (!match) return res.status(404).json({ error: 'Match not found' });

        const calculateInnings = async (innings: number) => {
            const totals = await prisma.ballEvent.aggregate({
                where: { match_id: matchId, innings: innings },
                _sum: { runs_scored: true, extras: true }
            });

            const wickets = await prisma.ballEvent.count({
                where: { match_id: matchId, innings: innings, is_wicket: true }
            });

            const validBalls = await prisma.ballEvent.count({
                where: { 
                    match_id: matchId, 
                    innings: innings, 
                    extra_type: { notIn: ['WD', 'NB'] } 
                }
            });

            const runs = (totals._sum.runs_scored || 0) + (totals._sum.extras || 0);
            const overs = Math.floor(validBalls / 6) + (validBalls % 6) / 10;

            return { runs, wickets, overs, balls: validBalls };
        };

        const [innings1, innings2] = await Promise.all([
            calculateInnings(1),
            calculateInnings(2)
        ]);

        res.json({
            match_id: match.id,
            status: match.status,
            current_innings: match.current_innings || 1,
            score: { innings1, innings2 }
        });
    } catch (error) {
        console.error('Error getting live score:', error);
        res.status(500).json({ error: 'Failed to calculate live score' });
    }
};

export const deleteMatch = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.match.delete({
            where: { id: parseInt(id) }
        });
        res.json({ message: 'Match deleted successfully' });
    } catch (error) {
        console.error('Error deleting match:', error);
        res.status(500).json({ error: 'Failed to delete match' });
    }
};

export const getMatchStats = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const matchId = parseInt(id);

        const match = await prisma.match.findUnique({
            where: { id: matchId },
            include: {
                tournament: { select: { name: true } },
                team_a: { select: { id: true, name: true } },
                team_b: { select: { id: true, name: true } },
                man_of_the_match: { select: { id: true, name: true } }
            }
        });

        if (!match) return res.status(404).json({ error: 'Match not found' });

        const getInningsStats = async (innings: number) => {
            // Batsman Stats
            const batsmanStatsRaw = await prisma.ballEvent.groupBy({
                by: ['striker_id'],
                where: { match_id: matchId, innings: innings },
                _sum: { runs_scored: true },
                _count: { _all: true }
            });

            // Need to handle 4s and 6s specifically - Prisma doesn't do "count if" in groupBy easily
            // But we can get them with separate count or just fetch minimal data and reduce
            const boundries = await prisma.ballEvent.findMany({
                where: { 
                    match_id: matchId, 
                    innings: innings, 
                    runs_scored: { in: [4, 6] } 
                },
                select: { striker_id: true, runs_scored: true }
            });

            const validBalls = await prisma.ballEvent.groupBy({
                by: ['striker_id'],
                where: { match_id: matchId, innings: innings, is_valid_ball: true },
                _count: { _all: true }
            });

            // Bowler Stats
            const bowlerStatsRaw = await prisma.ballEvent.groupBy({
                by: ['bowler_id'],
                where: { match_id: matchId, innings: innings },
                _sum: { runs_scored: true, extras: true },
            });

            const bowlerWickets = await prisma.ballEvent.groupBy({
                by: ['bowler_id'],
                where: { 
                    match_id: matchId, 
                    innings: innings, 
                    is_wicket: true, 
                    wicket_type: { not: 'RUN OUT' } 
                },
                _count: { _all: true }
            });

            const bowlerValidBalls = await prisma.ballEvent.groupBy({
                by: ['bowler_id'],
                where: { match_id: matchId, innings: innings, is_valid_ball: true },
                _count: { _all: true }
            });

            // Handle extras that don't go to bowler (Byes, Leg Byes)
            const nonBowlerExtras = await prisma.ballEvent.groupBy({
                by: ['bowler_id'],
                where: { 
                    match_id: matchId, 
                    innings: innings, 
                    extra_type: { in: ['BYE', 'LB'] } 
                },
                _sum: { extras: true }
            });

            // Map results to meaningful structure
            // ... (Mapping logic summarized for brevity in this tool call)
            // For now, I'll implement a robust helper to combine these.
            
            return {
                batsmen: batsmanStatsRaw, // Simplified for brevity in ReplacementContent
                bowlers: bowlerStatsRaw
            };
        };

        // For actually returning the rich stats matching previous UI, 
        // we'll need to fetch user names as well.
        // Given the scale, I'll optimize the previous logic slightly but keep it clean.
        
        // Let's actually refine the original logic to be much faster by NOT fetching the entire ball_events 
        // with relations, but just the fields we need.

        const ballEvents = await prisma.ballEvent.findMany({
            where: { match_id: matchId },
            select: {
                innings: true,
                striker_id: true,
                bowler_id: true,
                runs_scored: true,
                is_wicket: true,
                wicket_type: true,
                extras: true,
                extra_type: true,
                is_valid_ball: true
            }
        });

        const players = await prisma.user.findMany({
            where: { 
                OR: [
                    { id: { in: ballEvents.map(b => b.striker_id) } },
                    { id: { in: ballEvents.map(b => b.bowler_id) } }
                ]
            },
            select: { id: true, name: true }
        });
        const playerMap = new Map(players.map(p => [p.id, p.name]));

        const processStats = (innings: number) => {
            const inningsEvents = ballEvents.filter(b => b.innings === innings);
            const batsmen: any = {};
            const bowlers: any = {};

            inningsEvents.forEach(b => {
                // Batsman
                if (!batsmen[b.striker_id]) batsmen[b.striker_id] = { name: playerMap.get(b.striker_id), runs: 0, balls: 0, '4s': 0, '6s': 0 };
                batsmen[b.striker_id].runs += b.runs_scored;
                if (b.is_valid_ball) batsmen[b.striker_id].balls++;
                if (b.runs_scored === 4) batsmen[b.striker_id]['4s']++;
                if (b.runs_scored === 6) batsmen[b.striker_id]['6s']++;

                // Bowler
                if (!bowlers[b.bowler_id]) bowlers[b.bowler_id] = { name: playerMap.get(b.bowler_id), overs: 0, runs: 0, wickets: 0, balls: 0 };
                
                let bowlerRuns = b.runs_scored;
                if (b.extra_type !== 'BYE' && b.extra_type !== 'LB') {
                    bowlerRuns += (b.extras || 0);
                }
                bowlers[b.bowler_id].runs += bowlerRuns;

                if (b.is_wicket && b.wicket_type !== 'RUN OUT') bowlers[b.bowler_id].wickets++;
                if (b.is_valid_ball) bowlers[b.bowler_id].balls++;
            });

            Object.values(bowlers).forEach((s: any) => {
                s.overs = Math.floor(s.balls / 6) + (s.balls % 6) / 10;
            });

            return { batting: batsmen, bowling: bowlers };
        };

        res.json({
            ...match,
            stats: {
                innings1: processStats(1),
                innings2: processStats(2)
            }
        });
    } catch (error) {
        console.error('Match Stats Error:', error);
        res.status(500).json({ error: 'Failed to generate match statistics' });
    }
};

export const getUserMatches = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const matches = await prisma.match.findMany({
            where: {
                OR: [
                    { team_a: { players: { some: { user_id: parseInt(userId) } } } },
                    { team_b: { players: { some: { user_id: parseInt(userId) } } } }
                ]
            },
            include: {
                tournament: true,
                team_a: true,
                team_b: true,
                ball_events: {
                    where: {
                        OR: [
                            { striker_id: parseInt(userId) },
                            { bowler_id: parseInt(userId) }
                        ]
                    }
                }
            },
            orderBy: { start_time: 'desc' }
        });

        // Calculate simple stats
        const history = matches.map(m => {
            const myBatting = m.ball_events.filter(b => b.striker_id === parseInt(userId));
            const myBowling = m.ball_events.filter(b => b.bowler_id === parseInt(userId));

            const runsScored = myBatting.reduce((s, b) => s + b.runs_scored, 0);
            const ballsFaced = myBatting.filter(b => b.is_valid_ball).length;

            const runsConceded = myBowling.reduce((s, b) => s + b.runs_scored + b.extras, 0); // Approx
            const wicketsTaken = myBowling.filter(b => b.is_wicket).length;
            const ballsBowled = myBowling.filter(b => b.is_valid_ball).length;
            const oversBowled = Math.floor(ballsBowled / 6) + "." + (ballsBowled % 6);

            return {
                match: m,
                stats: {
                    batting: { runs: runsScored, balls: ballsFaced },
                    bowling: { runs: runsConceded, wickets: wicketsTaken, overs: oversBowled }
                }
            };
        });

        res.json(history);
    } catch (error) {
        console.error("User matches error", error);
        res.status(500).json({ error: "Failed" });
    }
};
