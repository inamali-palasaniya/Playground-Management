import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';

export const getAllPlans = async (req: Request, res: Response) => {
    try {
        const plans = await prisma.subscriptionPlan.findMany({
            orderBy: { id: 'desc' },
        });
        res.json(plans);
    } catch (error) {
        console.error('Error fetching subscription plans:', error);
        res.status(500).json({ error: 'Failed to fetch subscription plans', details: error instanceof Error ? error.message : String(error) });
    }
};

export const getPlanById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const plan = await prisma.subscriptionPlan.findUnique({
            where: { id: parseInt(id) },
            include: {
                subscriptions: {
                    include: {
                        user: {
                            select: { id: true, name: true, phone: true },
                        },
                    },
                },
            },
        });

        if (!plan) {
            return res.status(404).json({ error: 'Subscription plan not found' });
        }

        res.json(plan);
    } catch (error) {
        console.error('Error fetching subscription plan:', error);
        res.status(500).json({ error: 'Failed to fetch subscription plan', details: error instanceof Error ? error.message : String(error) });
    }
};

export const createPlan = async (req: Request, res: Response) => {
    try {
        const { name, rate_daily, rate_monthly, is_deposit_required, monthly_deposit_part } = req.body;

        // Validation
        if (!name) {
            return res.status(400).json({ error: 'Plan name is required' });
        }

        if (!rate_daily && !rate_monthly) {
            return res.status(400).json({ error: 'Either daily or monthly rate is required' });
        }

        const plan = await prisma.subscriptionPlan.create({
            data: {
                name,
                rate_daily: rate_daily !== undefined ? parseFloat(rate_daily) : null,
                rate_monthly: rate_monthly !== undefined ? parseFloat(rate_monthly) : null,
                is_deposit_required: is_deposit_required || false,
                monthly_deposit_part: monthly_deposit_part !== undefined ? parseFloat(monthly_deposit_part) : null,
            },
        });

        res.status(201).json(plan);
    } catch (error) {
        console.error('Error creating subscription plan:', error);
        res.status(500).json({ error: 'Failed to create subscription plan' });
    }
};

export const updatePlan = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, rate_daily, rate_monthly, is_deposit_required, monthly_deposit_part } = req.body;

        const plan = await prisma.subscriptionPlan.update({
            where: { id: parseInt(id) },
            data: {
                name,
                rate_daily: rate_daily !== undefined ? (rate_daily ? parseFloat(rate_daily) : null) : undefined,
                rate_monthly: rate_monthly !== undefined ? (rate_monthly ? parseFloat(rate_monthly) : null) : undefined,
                is_deposit_required,
                monthly_deposit_part: monthly_deposit_part !== undefined ? (monthly_deposit_part ? parseFloat(monthly_deposit_part) : null) : undefined,
            },
        });

        res.json(plan);
    } catch (error) {
        console.error('Error updating subscription plan:', error);
        res.status(500).json({ error: 'Failed to update subscription plan' });
    }
};

export const deletePlan = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Check if plan has active subscriptions
        const activeSubscriptions = await prisma.subscription.count({
            where: {
                plan_id: parseInt(id),
                status: 'ACTIVE',
            },
        });

        if (activeSubscriptions > 0) {
            return res.status(400).json({
                error: 'Cannot delete plan with active subscriptions',
            });
        }

        await prisma.subscriptionPlan.delete({
            where: { id: parseInt(id) },
        });

        res.json({ message: 'Subscription plan deleted successfully' });
    } catch (error) {
        console.error('Error deleting subscription plan:', error);
        res.status(500).json({ error: 'Failed to delete subscription plan' });
    }
};
