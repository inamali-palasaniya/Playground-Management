import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';

export const createGroup = async (req: Request, res: Response) => {
    try {
        const { name } = req.body;
        const group = await prisma.userGroup.create({
            data: { name },
        });
        res.status(201).json(group);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create group' });
    }
};

export const getGroups = async (req: Request, res: Response) => {
    try {
        const groups = await prisma.userGroup.findMany({
            include: { _count: { select: { users: true } } }
        });
        res.json(groups);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch groups' });
    }
};

export const updateGroup = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        const group = await prisma.userGroup.update({
            where: { id: parseInt(id) },
            data: { name },
        });
        res.json(group);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update group' });
    }
};

export const deleteGroup = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.userGroup.delete({
            where: { id: parseInt(id) },
        });
        res.json({ message: 'Group deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete group' });
    }
};
