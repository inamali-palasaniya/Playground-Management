import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';
import { calculateBattingStats, calculateBowlingStats, calculateInningsBreakdown } from '../services/analytics.service.js';

// Awards
export const setManOfTheMatch = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const match = await prisma.match.update({
      where: { id: parseInt(id) },
      data: { man_of_the_match_id: parseInt(user_id) },
      include: {
        man_of_the_match: { select: { id: true, name: true } },
      },
    });

    res.json(match);
  } catch (error) {
    console.error('Error setting Man of the Match:', error);
    res.status(500).json({ error: 'Failed to set award' });
  }
};

export const setManOfTheSeries = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const tournament = await prisma.tournament.update({
      where: { id: parseInt(id) },
      data: { man_of_the_series_id: parseInt(user_id) },
      include: {
        man_of_the_series: { select: { id: true, name: true } },
      },
    });

    res.json(tournament);
  } catch (error) {
    console.error('Error setting Man of the Series:', error);
    res.status(500).json({ error: 'Failed to set award' });
  }
};

// Points Table
export const getPointsTable = async (req: Request, res: Response) => {
  try {
    const { tournamentId } = req.params;

    // Fetch all teams in tournament
    const teams = await prisma.team.findMany({
      where: { tournament_id: parseInt(tournamentId) },
      select: { id: true, name: true }
    });

    // Fetch completed matches
    const matches = await prisma.match.findMany({
      where: {
        tournament_id: parseInt(tournamentId),
        status: 'COMPLETED'
      },
      include: {
        ball_events: true
      }
    });

    // Initialize Stats
    const stats: any = {};
    teams.forEach(t => {
      stats[t.id] = {
        teamId: t.id,
        teamName: t.name,
        played: 0,
        won: 0,
        lost: 0,
        tied: 0,
        points: 0,
        nrr: 0,
        runsScored: 0,
        ballsFaced: 0,
        runsConceded: 0,
        ballsBowled: 0
      };
    });

    matches.forEach((m: any) => {
      // Points
      if (m.winning_team_id) {
        if (stats[m.winning_team_id]) {
          stats[m.winning_team_id].played++;
          stats[m.winning_team_id].won++;
          stats[m.winning_team_id].points += 2;
        }
        const loserId = m.winning_team_id === m.team_a_id ? m.team_b_id : m.team_a_id;
        if (stats[loserId]) {
          stats[loserId].played++;
          stats[loserId].lost++;
        }
      } else {
        // Tie/No Result
        if (stats[m.team_a_id]) { stats[m.team_a_id].played++; stats[m.team_a_id].tied++; stats[m.team_a_id].points += 1; }
        if (stats[m.team_b_id]) { stats[m.team_b_id].played++; stats[m.team_b_id].tied++; stats[m.team_b_id].points += 1; }
      }

      // NRR Calculation Data
      // Iterate balls to sum scores
      m.ball_events.forEach((b: any) => {
        // Runs Scored
        if (b.batting_team_id && stats[b.batting_team_id]) {
          stats[b.batting_team_id].runsScored += b.runs_scored + b.extras;
          if (b.extra_type !== 'WD' && b.extra_type !== 'NB') {
            stats[b.batting_team_id].ballsFaced++;
          }
        }

        // Runs Conceded (opposing team)
        const bowlingTeamId = b.batting_team_id === m.team_a_id ? m.team_b_id : m.team_a_id;
        if (stats[bowlingTeamId]) {
          stats[bowlingTeamId].runsConceded += b.runs_scored + b.extras;
          if (b.extra_type !== 'WD' && b.extra_type !== 'NB') {
            stats[bowlingTeamId].ballsBowled++;
          }
        }
      });
    });

    // Final Calc
    const table = Object.values(stats).map((t: any) => {
      const oversFaced = t.ballsFaced / 6;
      const oversBowled = t.ballsBowled / 6;

      const battingRR = oversFaced > 0 ? t.runsScored / oversFaced : 0;
      const bowlingRR = oversBowled > 0 ? t.runsConceded / oversBowled : 0;

      t.nrr = (battingRR - bowlingRR).toFixed(3);
      return t;
    });

    // Sort
    table.sort((a: any, b: any) => {
      if (b.points !== a.points) return b.points - a.points;
      return parseFloat(b.nrr) - parseFloat(a.nrr);
    });

    res.json(table);

  } catch (error) {
    console.error('Error fetching points table:', error);
    res.status(500).json({ error: 'Failed to fetch points table' });
  }
};

// Tournament Stats (Leaderboards)
export const getTournamentStats = async (req: Request, res: Response) => {
  try {
    const { tournamentId } = req.params;

    const matches = await prisma.match.findMany({
      where: { tournament_id: parseInt(tournamentId), status: 'COMPLETED' },
      include: {
        ball_events: {
          include: {
            striker: { select: { id: true, name: true } },
            bowler: { select: { id: true, name: true } }
          }
        }
      }
    });

    // Flatten all ball events
    const allBallEvents = matches.flatMap(m => m.ball_events);

    // Reuse service calculation
    const batting = calculateBattingStats(allBallEvents); // Sorts by runs desc
    const bowling = calculateBowlingStats(allBallEvents); // Sorts by wickets desc

    res.json({
      batting,
      bowling
    });

  } catch (error) {
    console.error('Error fetching tournament stats:', error);
    res.status(500).json({ error: 'Failed to fetch tournament stats' });
  }
};

export const getMatchStats = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const match = await prisma.match.findUnique({
      where: { id: parseInt(id) },
      include: {
        tournament: true,
        team_a: true,
        team_b: true,
        man_of_the_match: { select: { id: true, name: true } },
        ball_events: {
            include: {
                striker: { select: { id: true, name: true } },
                bowler: { select: { id: true, name: true } },
                non_striker: { select: { id: true, name: true } },
            },
            orderBy: [{ innings: 'asc' }, { over_number: 'asc' }, { ball_number: 'asc' }]
        },
      },
    });

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    // Determine which team batted first based on toss
    let team1 = match.team_a;
    let team2 = match.team_b;

    if (match.toss_decision === 'BAT') {
      team1 = match.toss_winner_id === match.team_a_id ? match.team_a : match.team_b;
      team2 = match.toss_winner_id === match.team_a_id ? match.team_b : match.team_a;
    } else if (match.toss_decision === 'BOWL') {
      team1 = match.toss_winner_id === match.team_a_id ? match.team_b : match.team_a;
      team2 = match.toss_winner_id === match.team_a_id ? match.team_a : match.team_b;
    }

    const innings1Balls = match.ball_events.filter(b => b.innings === 1);
    const innings2Balls = match.ball_events.filter(b => b.innings === 2);

    const innings1 = calculateInningsBreakdown(innings1Balls, team1?.name || 'Team 1', team2?.name || 'Team 2');
    const innings2 = calculateInningsBreakdown(innings2Balls, team2?.name || 'Team 2', team1?.name || 'Team 1');

    const batting = calculateBattingStats(match.ball_events);
    const bowling = calculateBowlingStats(match.ball_events);

    const target = innings1.totalRuns > 0 ? innings1.totalRuns + 1 : null;
    let requiredRuns = null;
    let remainingBalls = null;
    let requiredRunRate = null;

    if (target && match.current_innings === 2) {
      requiredRuns = Math.max(0, target - innings2.totalRuns);
      const maxBalls = (match.overs || 20) * 6;
      remainingBalls = Math.max(0, maxBalls - innings2.balls);
      if (remainingBalls > 0 && requiredRuns > 0) {
        requiredRunRate = ((requiredRuns / remainingBalls) * 6).toFixed(2);
      } else if (requiredRuns <= 0) {
        requiredRunRate = '0.00';
      }
    }

    res.json({
      match_id: match.id,
      match: {
        id: match.id,
        status: match.status,
        overs: match.overs,
        current_innings: match.current_innings,
        is_completed: match.is_completed,
        toss_winner_id: match.toss_winner_id,
        toss_decision: match.toss_decision,
        winning_team_id: match.winning_team_id,
        result_description: match.result_description,
        man_of_the_match: match.man_of_the_match,
        tournament: match.tournament,
        team_a: match.team_a,
        team_b: match.team_b,
      },
      innings1,
      innings2,
      stats: {
        innings1,
        innings2,
      },
      target,
      requiredRuns,
      remainingBalls,
      requiredRunRate,
      batting,
      bowling,
    });
  } catch (error) {
    console.error('Error fetching match stats:', error);
    res.status(500).json({ error: 'Failed to fetch match stats' });
  }
};
