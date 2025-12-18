import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';
import { AuditService } from '../services/audit.service.js';

export const checkIn = async (req: Request, res: Response) => {
  try {
    const { user_id, date, lat, lng } = req.body;
    // Prefer user_id from auth if available, else from body (admin mode or unprotected)
    // For now keeping user_id from body for flexibility or matching existing API style
    const targetUserId = user_id ? parseInt(user_id) : (req as any).user?.userId;

    if (!targetUserId) return res.status(400).json({ error: 'User ID required' });

    // Use provided date as the actual check-in time (including time component), or default to now
    const actualInTime = date ? new Date(date) : new Date();

    // Normalize date for uniqueness check (Date part only)
    const checkInDate = new Date(actualInTime);
    checkInDate.setHours(0, 0, 0, 0);

    // Check if any attendance exists for this date (Single Session constraint)
    const existing = await prisma.attendance.findFirst({
      where: {
        user_id: targetUserId,
        date: checkInDate,
      },
    });

    if (existing) {
      return res.status(409).json({
        error: 'Already checked in for this date',
        existing: {
          in_time: existing.in_time,
          out_time: existing.out_time,
          date: existing.date
        }
      });
    }

    // Get user's active subscription
    const now = new Date();
    const activeSubscription = await prisma.subscription.findFirst({
      where: {
        user_id: targetUserId,
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

    // Calculate daily fee based on subscription PAYMENT FREQUENCY
    if (activeSubscription?.plan) {
      if (activeSubscription.payment_frequency === 'DAILY') {
        if (activeSubscription.plan.rate_daily && activeSubscription.plan.rate_daily > 0) {
          dailyFee = activeSubscription.plan.rate_daily;
        }
      }
    }

    // Create attendance record
    const attendance = await prisma.attendance.create({
      data: {
        user_id: targetUserId,
        date: checkInDate,
        is_present: true,
        in_time: actualInTime,
        location_lat: lat,
        location_lng: lng,
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
          user_id: targetUserId,
          type: 'DAILY_FEE',
          transaction_type: 'DEBIT',
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

export const checkOut = async (req: Request, res: Response) => {
  try {
    const { user_id, date } = req.body;
    const targetUserId = user_id ? parseInt(user_id) : (req as any).user?.userId;

    if (!targetUserId) return res.status(400).json({ error: 'User ID required' });

    // Find the LATEST active attendance record (where out_time is null)
    // This is more robust than matching 'today' which suffers timezone issues
    const attendance = await prisma.attendance.findFirst({
      where: {
        user_id: targetUserId,
        out_time: null
      },
      orderBy: { date: 'desc' }
    });

    if (!attendance) {
      return res.status(404).json({ error: 'No active check-in found to check out.' });
    }

    const updated = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        out_time: new Date()
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Error checking out:', error);
    res.status(500).json({ error: 'Failed to check out' });
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

export const updateAttendance = async (req: Request, res: Response) => {
  try {
    // RBAC Check
    const currentUser = (req as any).user;
    if (!currentUser || currentUser.role !== 'MANAGEMENT') {
      return res.status(403).json({ error: 'Forbidden: Only Management can modify attendance' });
    }

    const { id } = req.params;
    const { is_present, in_time, out_time, daily_fee_charged } = req.body;

    const attendanceId = parseInt(id);

    // Get original attendance to check for fee changes
    const original = await prisma.attendance.findUnique({
      where: { id: attendanceId }
    });

    if (!original) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }

    const updated = await prisma.attendance.update({
      where: { id: attendanceId },
      data: {
        is_present,
        in_time: in_time ? new Date(in_time) : undefined,
        out_time: out_time ? new Date(out_time) : undefined,
        daily_fee_charged: daily_fee_charged !== undefined ? Number(daily_fee_charged) : undefined,
      },
    });

    // Sync Ledger if fee changed
    if (daily_fee_charged !== undefined) {
      const newFee = Number(daily_fee_charged);
      if (original.daily_fee_charged !== newFee) {
        // Find existing ledger entry for this attendance (DAILY_FEE, same user, same date)
        // Note: Ledger doesn't link directly to attendance ID, so we match by User + Date + Type
        // To be safe, we look for one created around the same time or just match date
        const dateStart = new Date(original.date);
        dateStart.setHours(0, 0, 0, 0);
        const dateEnd = new Date(original.date);
        dateEnd.setHours(23, 59, 59, 999);

        const ledgerEntry = await prisma.feeLedger.findFirst({
          where: {
            user_id: original.user_id,
            type: 'DAILY_FEE',
            date: {
              gte: dateStart,
              lte: dateEnd
            },
            transaction_type: 'DEBIT' // Added for strictness
          }
        });

        if (newFee > 0) {
          if (ledgerEntry) {
            // Update existing
            await prisma.feeLedger.update({
              where: { id: ledgerEntry.id },
              data: { amount: newFee }
            });
          } else {
            // Create new if it didn't exist (e.g. fee was 0 before)
            await prisma.feeLedger.create({
              data: {
                user_id: original.user_id,
                type: 'DAILY_FEE',
                transaction_type: 'DEBIT',
                amount: newFee,
                date: original.date,
                is_paid: false,
                notes: `Daily fee for ${new Date(original.date).toISOString().split('T')[0]}`,
              }
            });
          }
        } else {
          // New fee is 0, delete ledger entry if exists
          if (ledgerEntry) {
            await prisma.feeLedger.delete({
              where: { id: ledgerEntry.id }
            });
          }
        }
      }
    }

    // Sync Ledger if fee changed -> (Logic handled above)

    const performedBy = (req as any).user?.userId || 1;
    await AuditService.logAction('ATTENDANCE', attendanceId, 'UPDATE', performedBy, { is_present, in_time, out_time, daily_fee_charged });

    res.json(updated);
  } catch (error) {
    console.error('Error updating attendance:', error);
    res.status(500).json({ error: 'Failed to update attendance' });
  }
};

export const deleteAttendance = async (req: Request, res: Response) => {
  try {
    // RBAC Check (Hybrid: Token First, then DB Fallback)
    const currentUser = (req as any).user;
    if (!currentUser) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let isAuthorized = currentUser.role === 'MANAGEMENT';

    if (!isAuthorized) {
      // Fallback: Check DB for strict/latest role if token is stale
      const dbUser = await prisma.user.findUnique({
        where: { id: currentUser.userId },
        select: { role: true }
      });
      if (dbUser && dbUser.role === 'MANAGEMENT') {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ error: 'Forbidden: Only Management can delete attendance' });
    }

    const { id } = req.params;
    const attendanceId = parseInt(id);

    const original = await prisma.attendance.findUnique({
      where: { id: attendanceId }
    });

    if (original) {
      // Delete associated ledger entry if it exists
      const dateStart = new Date(original.date);
      dateStart.setHours(0, 0, 0, 0);
      const dateEnd = new Date(original.date);
      dateEnd.setHours(23, 59, 59, 999);

      const ledgerEntry = await prisma.feeLedger.findFirst({
        where: {
          user_id: original.user_id,
          type: 'DAILY_FEE',
          date: {
            gte: dateStart,
            lte: dateEnd
          }
        }
      });

      if (ledgerEntry) {
        await prisma.feeLedger.delete({
          where: { id: ledgerEntry.id }
        });
      }
    }

    await prisma.attendance.delete({ where: { id: attendanceId } });

    const performedBy = (req as any).user?.userId || 1;
    await AuditService.logAction('ATTENDANCE', attendanceId, 'DELETE', performedBy, {
      date: original?.date ? new Date(original.date).toISOString().split('T')[0] : null,
      user_id: original?.user_id
    });

    res.json({ message: 'Attendance deleted' });
  } catch (error) {
    console.error('Error deleting attendance:', error);
    res.status(500).json({ error: 'Failed to delete attendance' });
  }
};
