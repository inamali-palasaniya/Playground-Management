import { Request, Response } from 'express';
import prisma from '../utils/prisma';

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

// Statistics
export const getMatchStats = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const match = await prisma.match.findUnique({
      where: { id: parseInt(id) },
      include: {
        ball_events: {
            include: {
                striker: { select: { id: true, name: true } },
                bowler: { select: { id: true, name: true } },
            }
        },
      },
    });

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    // Batting stats
    const battingStats: any = {};
    match.ball_events.forEach(ball => {
      const strikerId = ball.striker_id;
      if (!battingStats[strikerId]) {
        battingStats[strikerId] = {
            id: strikerId,
            name: ball.striker.name,
            runs: 0,
            balls: 0,
            fours: 0,
            sixes: 0
        };
      }
      battingStats[strikerId].runs += ball.runs_scored;
      if (ball.extra_type !== 'WIDE') {
          battingStats[strikerId].balls += 1;
      }
      if (ball.runs_scored === 4) battingStats[strikerId].fours += 1;
      if (ball.runs_scored === 6) battingStats[strikerId].sixes += 1;
    });

    // Bowling stats
    const bowlingStats: any = {};
    match.ball_events.forEach(ball => {
      const bowlerId = ball.bowler_id;
      if (!bowlingStats[bowlerId]) {
        bowlingStats[bowlerId] = {
            id: bowlerId,
            name: ball.bowler.name,
            runs: 0,
            wickets: 0,
            overs: 0, // Need precise calc
            balls: 0
        };
      }
      bowlingStats[bowlerId].runs += ball.runs_scored;
      if (ball.extra_type === 'WIDE' || ball.extra_type === 'NOBALL') {
          bowlingStats[bowlerId].runs += ball.extras;
      }
      
      if (ball.extra_type !== 'WIDE' && ball.extra_type !== 'NOBALL') {
           bowlingStats[bowlerId].balls += 1;
      }

      if (ball.is_wicket && ball.wicket_type !== 'RUNOUT') {
        bowlingStats[bowlerId].wickets += 1;
      }
    });
    
    // Format overs for bowlers
    Object.values(bowlingStats).forEach((bst: any) => {
        const balls = bst.balls;
        bst.overs = Math.floor(balls / 6) + (balls % 6) / 10;
    });

    res.json({
      match_id: match.id,
      batting: Object.values(battingStats).sort((a: any, b: any) => b.runs - a.runs),
      bowling: Object.values(bowlingStats).sort((a: any, b: any) => b.wickets - a.wickets),
    });
  } catch (error) {
    console.error('Error fetching match stats:', error);
    res.status(500).json({ error: 'Failed to fetch match stats' });
  }
};
