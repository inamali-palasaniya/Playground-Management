import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const checkIn = async (req: Request, res: Response) => {
  try {
    const { user_id, date } = req.body;
    const checkInDate = date ? new Date(date) : new Date();
    checkInDate.setHours(0, 0, 0, 0); // Normalize to start of day

    // Check if already checked in for this date
    const existing = await prisma.attendance.findFirst({
      where: {
        user_id: parseInt(user_id),
        date: checkInDate,
      },
    });

    if (existing) {
      return res.status(400).json({ error: 'Already checked in for this date' });
    }

    // Get user's active subscription
    const now = new Date();
    const activeSubscription = await prisma.subscription.findFirst({
      where: {
        user_id: parseInt(user_id),
        status: 'ACTIVE',
        OR: [
          { end_date: null },
          { end_date: { gte: now } },
        ],
      },
      include: {
        plan: true,
      },
    });

    let dailyFee = 0;

    // Calculate daily fee based on subscription plan
    if (activeSubscription?.plan) {
      // If plan has daily rate, charge it
      if (activeSubscription.plan.rate_daily) {
        dailyFee = activeSubscription.plan.rate_daily;
      }
      // If only monthly rate, no daily fee
    } else {
      // No active subscription - could set a default fee or block check-in
      // For now, we'll allow check-in with no fee
      dailyFee = 0;
    }

    // Create attendance record
    const attendance = await prisma.attendance.create({
      data: {
        user_id: parseInt(user_id),
        date: checkInDate,
        is_present: true,
        daily_fee_charged: dailyFee > 0 ? dailyFee : null,
      },
      include: {
        user: {
          select: { id: true, name: true, phone: true },
        },
      },
    });

    // If there's a daily fee, create a ledger entry
    if (dailyFee > 0) {
      await prisma.feeLedger.create({
        data: {
          user_id: parseInt(user_id),
          type: 'DAILY_FEE',
          amount: dailyFee,
          date: checkInDate,
          is_paid: false,
          notes: `Daily fee for ${checkInDate.toISOString().split('T')[0]}`,
        },
      });
    }

    res.status(201).json(attendance);
  } catch (error) {
    console.error('Error checking in:', error);
    res.status(500).json({ error: 'Failed to check in', details: error instanceof Error ? error.message : String(error) });
  }
};

export const getUserAttendance = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    const where: any = {
      user_id: parseInt(userId),
    };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    const attendance = await prisma.attendance.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    res.json(attendance);
  } catch (error) {
    console.error('Error fetching user attendance:', error);
    res.status(500).json({ error: 'Failed to fetch attendance', details: error instanceof Error ? error.message : String(error) });
  }
};

export const getAttendanceByDate = async (req: Request, res: Response) => {
  try {
    const { date } = req.params;
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const attendance = await prisma.attendance.findMany({
      where: {
        date: targetDate,
      },
      include: {
        user: {
          select: { id: true, name: true, phone: true },
        },
      },
      orderBy: { user: { name: 'asc' } },
    });

    res.json(attendance);
  } catch (error) {
    console.error('Error fetching attendance by date:', error);
    res.status(500).json({ error: 'Failed to fetch attendance', details: error instanceof Error ? error.message : String(error) });
  }
};

export const getAttendanceSummary = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    const where: any = {
      user_id: parseInt(userId),
    };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    const totalDays = await prisma.attendance.count({ where });
    const presentDays = await prisma.attendance.count({
      where: { ...where, is_present: true },
    });

    const totalFees = await prisma.attendance.aggregate({
      where,
      _sum: {
        daily_fee_charged: true,
      },
    });

    res.json({
      total_days: totalDays,
      present_days: presentDays,
      absent_days: totalDays - presentDays,
      attendance_percentage: totalDays > 0 ? (presentDays / totalDays) * 100 : 0,
      total_fees_charged: totalFees._sum.daily_fee_charged || 0,
    });
  } catch (error) {
    console.error('Error fetching attendance summary:', error);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
};
