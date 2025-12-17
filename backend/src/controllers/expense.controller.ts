import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';
import { AuditService } from '../services/audit.service.js';

export const createExpense = async (req: Request, res: Response) => {
    try {
        const { name, category, amount, date, notes } = req.body;

        if (!name || !amount || !category) {
            return res.status(400).json({ error: 'Name, Category and Amount are required.' });
        }

        const expense = await prisma.expense.create({
            data: {
                name,
                category,
                amount: parseFloat(amount),
                date: date ? new Date(date) : new Date(),
                notes
            }
        });

        res.status(201).json(expense);

        const performedBy = (req as any).user?.userId || 1;
        await AuditService.logAction('EXPENSE', expense.id, 'CREATE', performedBy, { name, amount, category });
    } catch (error) {
        console.error('Error creating expense:', error);
        res.status(500).json({ error: 'Failed to create expense' });
    }
};

export const getExpenses = async (req: Request, res: Response) => {
    try {
        const { start_date, end_date, category } = req.query;

        const where: any = {};

        if (start_date && end_date) {
            where.date = {
                gte: new Date(start_date as string),
                lte: new Date(end_date as string)
            };
        }

        if (category) {
            where.category = category as string;
        }

        const expenses = await prisma.expense.findMany({
            where,
            orderBy: { date: 'desc' }
        });

        res.json(expenses);
    } catch (error) {
        console.error('Error fetching expenses:', error);
        res.status(500).json({ error: 'Failed to fetch expenses' });
    }
};

export const updateExpense = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, category, amount, date, notes } = req.body;

        const expense = await prisma.expense.update({
            where: { id: parseInt(id) },
            data: {
                name,
                category,
                amount: amount ? parseFloat(amount) : undefined,
                date: date ? new Date(date) : undefined,
                notes
            }
        });

        res.json(expense);

        const performedBy = (req as any).user?.userId || 1;
        await AuditService.logAction('EXPENSE', expense.id, 'UPDATE', performedBy, req.body);
    } catch (error) {
        console.error('Error updating expense:', error);
        res.status(500).json({ error: 'Failed to update expense' });
    }
};

export const deleteExpense = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const deleted = await prisma.expense.delete({
            where: { id: parseInt(id) }
        });

        const performedBy = (req as any).user?.userId || 1;
        await AuditService.logAction('EXPENSE', deleted.id, 'DELETE', performedBy, { name: deleted.name, amount: deleted.amount });

        res.json({ message: 'Expense deleted successfully' });
    } catch (error) {
        console.error('Error deleting expense:', error);
        res.status(500).json({ error: 'Failed to delete expense' });
    }
};

export const getExpenseStats = async (req: Request, res: Response) => {
    try {
        // Simple aggregation: Total expenses this month, Total expenses overall
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const totalExpenses = await prisma.expense.aggregate({
            _sum: { amount: true }
        });

        const currentMonthExpenses = await prisma.expense.aggregate({
            where: {
                date: { gte: startOfMonth }
            },
            _sum: { amount: true }
        });

        res.json({
            total_overall: totalExpenses._sum.amount || 0,
            total_this_month: currentMonthExpenses._sum.amount || 0
        });
    } catch (error) {
        console.error('Error fetching expense stats:', error);
        res.status(500).json({ error: 'Failed to fetch expense stats' });
    }
};
