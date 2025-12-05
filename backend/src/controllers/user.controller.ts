import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const createUser = async (req: Request, res: Response) => {
    try {
        const { name, phone, email, role, group_id } = req.body;
        const user = await prisma.user.create({
            data: {
                name,
                phone,
                email,
                role,
                group_id,
            },
        });
        res.status(201).json(user);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create user' });
    }
};

export const getUsers = async (req: Request, res: Response) => {
    try {
        const users = await prisma.user.findMany({
            include: { group: true },
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

export const getUserById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = await prisma.user.findUnique({
            where: { id: Number(id) },
            include: { group: true, subscriptions: true, fee_ledger: true },
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch user' });
    }
};
