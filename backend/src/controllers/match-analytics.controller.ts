import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { calculateBattingStats, calculateBowlingStats } from '../services/analytics.service';

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

    const batting = calculateBattingStats(match.ball_events);
    const bowling = calculateBowlingStats(match.ball_events);

    res.json({
      match_id: match.id,
      batting,
      bowling,
    });
  } catch (error) {
    console.error('Error fetching match stats:', error);
    res.status(500).json({ error: 'Failed to fetch match stats' });
  }
};
