import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const createExpense = async (req: Request, res: Response) => {
    try {
        const { name, category, amount, notes } = req.body;
        const expense = await prisma.expense.create({
            data: {
                name,
                category,
                amount,
                notes,
            },
        });
        res.status(201).json(expense);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create expense' });
    }
};

export const getExpenses = async (req: Request, res: Response) => {
    try {
        const expenses = await prisma.expense.findMany({
            orderBy: { date: 'desc' },
        });
        res.json(expenses);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch expenses' });
    }
};
