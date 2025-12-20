import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';

// Financial Summary
export const getFinancialSummary = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, userId } = req.query;

    const where: any = {};
    if (userId) {
      where.user_id = parseInt(userId as string);
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    // Total income (payments)
    const income = await prisma.feeLedger.aggregate({
      where: { ...where, type: 'PAYMENT' },
      _sum: { amount: true },
    });

    // Total charges (fees + fines)
    const charges = await prisma.feeLedger.aggregate({
      where: {
        ...where,
        type: { in: ['DAILY_FEE', 'MONTHLY_FEE', 'FINE'] },
      },
      _sum: { amount: true },
    });

    // Total expenses
    const expenseWhere: any = {};
    if (startDate || endDate) {
      expenseWhere.date = {};
      if (startDate) expenseWhere.date.gte = new Date(startDate as string);
      if (endDate) expenseWhere.date.lte = new Date(endDate as string);
    }

    const expenses = await prisma.expense.aggregate({
      where: expenseWhere,
      _sum: { amount: true },
    });

    // Outstanding balance
    const unpaid = await prisma.feeLedger.aggregate({
      where: {
        type: { in: ['DAILY_FEE', 'MONTHLY_FEE', 'FINE'] },
        is_paid: false,
      },
      _sum: { amount: true },
    });

    const totalIncome = income._sum.amount || 0;
    const totalCharges = charges._sum.amount || 0;
    const totalExpenses = expenses._sum.amount || 0;
    const outstandingBalance = unpaid._sum.amount || 0;

    res.json({
      total_income: totalIncome,
      total_charges: totalCharges,
      total_expenses: totalExpenses,
      outstanding_balance: outstandingBalance,
      net_profit: totalIncome - totalExpenses,
      collection_rate: totalCharges > 0 ? (totalIncome / totalCharges) * 100 : 0,
    });
  } catch (error) {
    console.error('Error fetching financial summary:', error);
    res.status(500).json({ error: 'Failed to fetch financial summary' });
  }
};

// Attendance Statistics
export const getAttendanceStats = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, userId } = req.query;

    const where: any = {};
    if (userId) {
      where.user_id = parseInt(userId as string);
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    const totalAttendance = await prisma.attendance.count({ where });
    const presentCount = await prisma.attendance.count({
      where: { ...where, is_present: true },
    });

    // Unique users who attended
    const uniqueUsers = await prisma.attendance.groupBy({
      by: ['user_id'],
      where,
    });

    // Average daily attendance
    const attendanceByDate = await prisma.attendance.groupBy({
      by: ['date'],
      where,
      _count: true,
    });

    const avgDailyAttendance = attendanceByDate.length > 0
      ? totalAttendance / attendanceByDate.length
      : 0;

    // --- Live Counters ---
    const totalUsersCount = await prisma.user.count();

    // Active Users (Enabled)
    const activeUsersCount = await prisma.user.count({
      where: { is_active: true }
    });

    // Inactive Users (Disabled)
    const inactiveUsersCount = await prisma.user.count({
      where: { is_active: false }
    });

    // 2. Today's formatted date string (YYYY-MM-DD) for strict day matching or use date range
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // 3. Today In (Present users today)
    const todayInCount = await prisma.attendance.count({
      where: {
        date: {
          gte: startOfToday,
          lte: endOfToday
        },
        is_present: true
      }
    });

    // 4. Today Out (Active Total - In) - Assuming inactive users don't punch in
    const todayOutCount = Math.max(0, activeUsersCount - todayInCount);

    // --- Aggregated Stats by User Role ---
    const usersByRole = await prisma.user.groupBy({
      by: ['role'],
      _count: true
    });

    const presentUsersByRole = await prisma.attendance.findMany({
      where: {
        date: { gte: startOfToday, lte: endOfToday },
        is_present: true
      },
      include: { user: { select: { role: true } } }
    });

    const breakdownByRole = usersByRole.map(group => {
      const role = group.role;
      const total = group._count;
      const inCount = presentUsersByRole.filter(a => a.user.role === role).length;
      return {
        role,
        total,
        in: inCount,
        out: Math.max(0, total - inCount)
      };
    });

    // --- Expired Monthly Plans ---
    // Users whose latest subscription is EXPIRED and plan name contains 'Monthly'
    const expiredMonthlyCount = await prisma.subscription.count({
      where: {
        status: 'EXPIRED',
        plan: {
          name: { contains: 'Monthly', mode: 'insensitive' }
        }
      }
    });

    // --- Upcoming Expirations (Next 3 days) ---
    const andThreeDays = new Date();
    andThreeDays.setDate(andThreeDays.getDate() + 3);
    const upcomingExpirationsCount = await prisma.subscription.count({
      where: {
        status: 'ACTIVE',
        end_date: {
          gte: new Date(),
          lte: andThreeDays
        }
      }
    });

    // --- Outstanding Balance Count ---
    const userLedgers = await prisma.feeLedger.groupBy({
      by: ['user_id'],
      _sum: {
        amount: true
      },
      where: {
        transaction_type: 'DEBIT'
      }
    });

    // This is a bit complex with Prisma groupBy for balance. 
    // Let's do a more efficient raw query or fetch all active users and calculate.
    // Given the scale, fetching all users with their ledger sums might be okay for now, 
    // but ideally we'd have a balance field on User.
    const usersWithLedgers = await prisma.user.findMany({
      where: { is_active: true },
      select: {
        id: true,
        fee_ledger: {
          select: { amount: true, transaction_type: true }
        }
      }
    });

    const outstandingBalanceCount = usersWithLedgers.filter(user => {
      let totalDebits = 0;
      let totalCredits = 0;
      user.fee_ledger.forEach(t => {
        if (t.transaction_type === 'DEBIT') totalDebits += t.amount;
        else if (t.transaction_type === 'CREDIT') totalCredits += t.amount;
      });
      return (totalDebits - totalCredits) > 0;
    }).length;

    res.json({
      total_attendance: totalAttendance,
      present_count: presentCount,
      unique_users: uniqueUsers.length,
      total_days: attendanceByDate.length,
      avg_daily_attendance: Math.round(avgDailyAttendance * 10) / 10,
      attendance_rate: totalAttendance > 0 ? (presentCount / totalAttendance) * 100 : 0,
      // New Live Stats
      total_users: totalUsersCount,
      active_users: activeUsersCount,
      inactive_users: inactiveUsersCount,
      today_in: todayInCount,
      today_out: todayOutCount,
      breakdown_by_role: breakdownByRole,
      expired_monthly_count: expiredMonthlyCount,
      upcoming_expirations_count: upcomingExpirationsCount,
      outstanding_balance_count: outstandingBalanceCount
    });
  } catch (error) {
    console.error('Error fetching attendance stats:', error);
    res.status(500).json({ error: 'Failed to fetch attendance stats' });
  }
};

// Income vs Expense Report
export const getIncomeExpenseReport = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, groupBy = 'month' } = req.query;

    const where: any = {};
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    // Get income by period
    const income = await prisma.feeLedger.findMany({
      where: { ...where, type: 'PAYMENT' },
      select: { date: true, amount: true },
    });

    // Get expenses by period
    const expenseWhere: any = {};
    if (startDate || endDate) {
      expenseWhere.date = {};
      if (startDate) expenseWhere.date.gte = new Date(startDate as string);
      if (endDate) expenseWhere.date.lte = new Date(endDate as string);
    }

    const expenses = await prisma.expense.findMany({
      where: expenseWhere,
      select: { date: true, amount: true, category: true },
    });

    // Group by category
    const expensesByCategory = expenses.reduce((acc: any, exp: any) => {
      if (!acc[exp.category]) {
        acc[exp.category] = 0;
      }
      acc[exp.category] += exp.amount;
      return acc;
    }, {});

    res.json({
      total_income: income.reduce((sum: number, i: any) => sum + i.amount, 0),
      total_expenses: expenses.reduce((sum: number, e: any) => sum + e.amount, 0),
      expenses_by_category: expensesByCategory,
      income_data: income,
      expense_data: expenses,
    });
  } catch (error) {
    console.error('Error fetching income/expense report:', error);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
};
