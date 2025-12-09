import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';

// Subscription Plans
export const getSubscriptionPlans = async (req: Request, res: Response) => {
    try {
        const plans = await prisma.subscriptionPlan.findMany();
        res.json(plans);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch subscription plans' });
    }
};

export const createSubscriptionPlan = async (req: Request, res: Response) => {
    try {
        const { name, rate_daily, rate_monthly, is_deposit_required } = req.body;
        const plan = await prisma.subscriptionPlan.create({
            data: { name, rate_daily, rate_monthly, is_deposit_required },
        });
        res.status(201).json(plan);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create subscription plan' });
    }
};

// Subscriptions
export const createSubscription = async (req: Request, res: Response) => {
    try {
        const { user_id, plan_id, start_date, amount_paid } = req.body;
        const subscription = await prisma.subscription.create({
            data: {
                user_id,
                plan_id,
                start_date: new Date(start_date),
                amount_paid,
                status: 'ACTIVE',
            },
        });
        res.status(201).json(subscription);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create subscription' });
    }
};

// Fees & Fines
export const addFee = async (req: Request, res: Response) => {
    try {
        const { user_id, type, amount } = req.body;
        const fee = await prisma.feeLedger.create({
            data: {
                user_id,
                type,
                amount,
                is_paid: false,
            },
        });
        res.status(201).json(fee);
    } catch (error) {
        res.status(500).json({ error: 'Failed to add fee' });
    }
};

export const getFeeLedger = async (req: Request, res: Response) => {
    try {
        const { user_id } = req.params;
        const ledger = await prisma.feeLedger.findMany({
            where: { user_id: Number(user_id) },
            orderBy: { date: 'desc' },
        });
        res.json(ledger);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch fee ledger' });
    }
};

// User Subscriptions Management
export const getUserSubscriptions = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const subscriptions = await prisma.subscription.findMany({
            where: { user_id: parseInt(userId) },
            include: {
                plan: true,
            },
            orderBy: { id: 'desc' },
        });
        res.json(subscriptions);
    } catch (error) {
        console.error('Error fetching user subscriptions:', error);
        res.status(500).json({ error: 'Failed to fetch user subscriptions' });
    }
};

export const getActiveSubscription = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const now = new Date();

        const subscription = await prisma.subscription.findFirst({
            where: {
                user_id: parseInt(userId),
                status: 'ACTIVE',
                OR: [
                    { end_date: null },
                    { end_date: { gte: now } },
                ],
            },
            include: {
                plan: true,
            },
            orderBy: { id: 'desc' },
        });

        if (!subscription) {
            return res.status(404).json({ error: 'No active subscription found' });
        }

        res.json(subscription);
    } catch (error) {
        console.error('Error fetching active subscription:', error);
        res.status(500).json({ error: 'Failed to fetch active subscription' });
    }
};

export const getSubscriptionById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const subscription = await prisma.subscription.findUnique({
            where: { id: parseInt(id) },
            include: {
                plan: true,
                user: {
                    select: { id: true, name: true, phone: true, email: true },
                },
            },
        });

        if (!subscription) {
            return res.status(404).json({ error: 'Subscription not found' });
        }

        res.json(subscription);
    } catch (error) {
        console.error('Error fetching subscription:', error);
        res.status(500).json({ error: 'Failed to fetch subscription' });
    }
};

export const updateSubscriptionStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status, end_date } = req.body;

        const subscription = await prisma.subscription.update({
            where: { id: parseInt(id) },
            data: {
                status,
                end_date: end_date ? new Date(end_date) : undefined,
            },
            include: {
                plan: true,
            },
        });

        res.json(subscription);
    } catch (error) {
        console.error('Error updating subscription status:', error);
        res.status(500).json({ error: 'Failed to update subscription status' });
    }
};
