import { Request, Response } from 'express';
import prisma from '../utils/prisma';

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
