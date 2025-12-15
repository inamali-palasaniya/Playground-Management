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
    // 1. Total Active Users (Normal users)
    const totalActiveUsers = await prisma.user.count({
      where: { role: 'NORMAL' }
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
        is_present: true,
        user: { role: 'NORMAL' } // Only count normal users
      }
    });

    // 4. Today Out (Total - In)
    const todayOutCount = Math.max(0, totalActiveUsers - todayInCount);

    res.json({
      total_attendance: totalAttendance,
      present_count: presentCount,
      unique_users: uniqueUsers.length,
      total_days: attendanceByDate.length,
      avg_daily_attendance: Math.round(avgDailyAttendance * 10) / 10,
      attendance_rate: totalAttendance > 0 ? (presentCount / totalAttendance) * 100 : 0,
      // New Live Stats
      total_active_users: totalActiveUsers,
      today_in: todayInCount,
      today_out: todayOutCount
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
