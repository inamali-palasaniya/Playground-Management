import { Request, Response } from 'express';
import prisma from '../utils/prisma';

// Record Payment
export const recordPayment = async (req: Request, res: Response) => {
  try {
    const { user_id, amount, payment_method, notes } = req.body;

    if (!user_id || !amount) {
      return res.status(400).json({ error: 'User ID and amount are required' });
    }

    // Create payment entry in ledger
    const payment = await prisma.feeLedger.create({
      data: {
        user_id: parseInt(user_id),
        type: 'PAYMENT',
        amount: parseFloat(amount),
        is_paid: true, // Payments are always "paid"
        notes: notes || `Payment via ${payment_method || 'cash'}`,
      },
      include: {
        user: {
          select: { id: true, name: true, phone: true },
        },
      },
    });

    res.status(201).json(payment);
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({ error: 'Failed to record payment' });
  }
};

// Get Outstanding Balance
export const getOutstandingBalance = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Get all unpaid fees and fines
    const unpaidCharges = await prisma.feeLedger.aggregate({
      where: {
        user_id: parseInt(userId),
        type: { in: ['DAILY_FEE', 'MONTHLY_FEE', 'FINE', 'DEPOSIT'] },
        is_paid: false,
      },
      _sum: {
        amount: true,
      },
    });

    // Get all payments
    const payments = await prisma.feeLedger.aggregate({
      where: {
        user_id: parseInt(userId),
        type: 'PAYMENT',
      },
      _sum: {
        amount: true,
      },
    });

    const totalCharges = unpaidCharges._sum.amount || 0;
    const totalPayments = payments._sum.amount || 0;
    const outstandingBalance = totalCharges - totalPayments;

    // Get breakdown by type
    const breakdown = await prisma.feeLedger.groupBy({
      by: ['type'],
      where: {
        user_id: parseInt(userId),
        is_paid: false,
      },
      _sum: {
        amount: true,
      },
    });

    res.json({
      outstanding_balance: Math.max(0, outstandingBalance),
      total_charges: totalCharges,
      total_payments: totalPayments,
      breakdown: breakdown.map(b => ({
        type: b.type,
        amount: b._sum.amount || 0,
      })),
    });
  } catch (error) {
    console.error('Error calculating balance:', error);
    res.status(500).json({ error: 'Failed to calculate balance' });
  }
};

// Get Payment History
export const getPaymentHistory = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    const where: any = {
      user_id: parseInt(userId),
      type: 'PAYMENT',
    };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    const payments = await prisma.feeLedger.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    const totalPaid = await prisma.feeLedger.aggregate({
      where,
      _sum: {
        amount: true,
      },
    });

    res.json({
      payments,
      total_paid: totalPaid._sum.amount || 0,
    });
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
};

// Get Complete User Ledger
export const getUserLedger = async (req: Request, res: Response) => {
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

    const ledger = await prisma.feeLedger.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    res.json(ledger);
  } catch (error) {
    console.error('Error fetching ledger:', error);
    res.status(500).json({ error: 'Failed to fetch ledger' });
  }
};
