import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';

export const createUser = async (req: Request, res: Response) => {
    try {
        const { name, phone, email, role, group_id, age, user_type, plan_id } = req.body;
        const user = await prisma.user.create({
            data: {
                name,
                phone,
                email,
                role,
                group_id: group_id ? parseInt(group_id) : null,
                age: age ? parseInt(age) : null,
                user_type
            },
        });

        if (plan_id) {
            const plan = await prisma.subscriptionPlan.findUnique({ where: { id: parseInt(plan_id) } });

            if (plan) {
                await prisma.subscription.create({
                    data: {
                        user_id: user.id,
                        plan_id: plan.id,
                        start_date: new Date(),
                        status: 'ACTIVE',
                        amount_paid: 0
                    }
                });

                // Financial Logic: Initial Charges
                const now = new Date();

                // 1. Initial Monthly Fee Debit (if applicable)
                if (plan.rate_monthly && plan.rate_monthly > 0) {
                    await prisma.feeLedger.create({
                        data: {
                            user_id: user.id,
                            type: 'MONTHLY_FEE',
                            transaction_type: 'DEBIT',
                            amount: plan.rate_monthly,
                            // Could pro-rate here, but for MVP full charge? 
                            // Let's stick to full charge or maybe the subscription creation implies start of billing cycle.
                            is_paid: false,
                            notes: `Initial Monthly Fee (Plan: ${plan.name})`
                        }
                    });
                }

                // 2. Initial Deposit Debit (if required)
                // Logic: If 'is_deposit_required' is true, we should probably charge a deposit? 
                // But schema doesn't have a specific 'deposit_amount' field on Plan (only monthly_deposit_part).
                // Assuming 'Earned (Paid Deposit)' implies a large upfront deposit, but without a field, 
                // we'll rely on 'monthly_deposit_part' logic handled in monthly charges OR 
                // we can add a robust check later. 
                // For 'Earned (Deposit Split)', the deposit builds up monthly, so no initial charge needed maybe?
                // For 'Monthly Plan' (200 Rs) with 'is_deposit_required: true', what is the deposit amount?
                // It's missing in schema. 
                // I will add a default deposit charge of 2000 if is_deposit_required is true AND monthly_deposit_part is 0?
                // Or just leave it for now to avoid wrong charges. 
                // I'll stick to opening Monthly Fee charge.
            }
        }

        res.status(201).json(user);
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
};

export const getUsers = async (req: Request, res: Response) => {
    try {
        const { group_id } = req.query;
        const where: any = {};

        if (group_id) {
            where.group_id = parseInt(group_id as string);
        }

        const users = await prisma.user.findMany({
            where,
            include: { group: true },
            orderBy: { name: 'asc' }
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
