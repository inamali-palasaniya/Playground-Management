import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';
import { AuditService } from '../services/audit.service.js';

export const getPlans = async (req: Request, res: Response) => {
    try {
        const plans = await prisma.subscriptionPlan.findMany();
        res.json(plans);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching plans' });
    }
};

export const createPlan = async (req: Request, res: Response) => {
    try {
        const { name, rate_daily, rate_monthly, is_deposit_required } = req.body;
        const plan = await prisma.subscriptionPlan.create({
            data: { name, rate_daily, rate_monthly, is_deposit_required }
        });

        const performedBy = (req as any).user?.userId || 1;
        await AuditService.logAction('PLAN', plan.id, 'CREATE', performedBy, { name, rate_monthly });

        res.json(plan);
    } catch (error) {
        res.status(500).json({ error: 'Error creating plan' });
    }
};

export const getFines = async (req: Request, res: Response) => {
    try {
        const fines = await prisma.fineRule.findMany();
        res.json(fines);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching fines' });
    }
};

export const createFine = async (req: Request, res: Response) => {
    try {
        const { name, first_time_fine, subsequent_fine } = req.body;
        const fine = await prisma.fineRule.create({
            data: { name, first_time_fine, subsequent_fine }
        });

        const performedBy = (req as any).user?.userId || 1;
        await AuditService.logAction('FINE_RULE', fine.id, 'CREATE', performedBy, { name });

        res.json(fine);
    } catch (error) {
        res.status(500).json({ error: 'Error creating fine' });
    }
};

export const getGroups = async (req: Request, res: Response) => {
    try {
        const groups = await prisma.userGroup.findMany({ include: { users: true } });
        res.json(groups);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching groups' });
    }
};

export const createGroup = async (req: Request, res: Response) => {
    try {
        const { name } = req.body;
        const group = await prisma.userGroup.create({
            data: { name }
        });

        const performedBy = (req as any).user?.userId || 1;
        await AuditService.logAction('GROUP', group.id, 'CREATE', performedBy, { name });

        res.json(group);
    } catch (error) {
        res.status(500).json({ error: 'Error creating group' });
    }
};

// --- Update & Delete for Plans ---
export const updatePlan = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, rate_daily, rate_monthly, is_deposit_required } = req.body;
        const plan = await prisma.subscriptionPlan.update({
            where: { id: parseInt(id) },
            data: { name, rate_daily, rate_monthly, is_deposit_required }
        });

        const performedBy = (req as any).user?.userId || 1;
        await AuditService.logAction('PLAN', plan.id, 'UPDATE', performedBy, req.body);

        res.json(plan);
    } catch (error) {
        res.status(500).json({ error: 'Error updating plan' });
    }
};

export const deletePlan = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const deleted = await prisma.subscriptionPlan.delete({ where: { id: parseInt(id) } });

        const performedBy = (req as any).user?.userId || 1;
        await AuditService.logAction('PLAN', deleted.id, 'DELETE', performedBy, { name: deleted.name });

        res.json({ message: 'Plan deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting plan' });
    }
};

// --- Update & Delete for Fines ---
export const updateFine = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, first_time_fine, subsequent_fine } = req.body;
        const fine = await prisma.fineRule.update({
            where: { id: parseInt(id) },
            data: { name, first_time_fine, subsequent_fine }
        });

        const performedBy = (req as any).user?.userId || 1;
        await AuditService.logAction('FINE_RULE', fine.id, 'UPDATE', performedBy, req.body);

        res.json(fine);
    } catch (error) {
        res.status(500).json({ error: 'Error updating fine' });
    }
};

export const deleteFine = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const deleted = await prisma.fineRule.delete({ where: { id: parseInt(id) } });

        const performedBy = (req as any).user?.userId || 1;
        await AuditService.logAction('FINE_RULE', deleted.id, 'DELETE', performedBy, { name: deleted.name });

        res.json({ message: 'Fine deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting fine' });
    }
};
