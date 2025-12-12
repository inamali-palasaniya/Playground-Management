import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';

export const createUser = async (req: Request, res: Response) => {
    try {
        const { name, phone, email, role, group_id, age, user_type, plan_id } = req.body;
        const user = await prisma.user.create({
            data: {
                name,
                phone,
                email: email && email.trim() !== '' ? email : null,
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
    } catch (error: any) {
        console.error('Error creating user FULL DETIALS:', JSON.stringify(error, null, 2));

        if (error.code === 'P2002' && error.meta?.target) {
            const field = Array.isArray(error.meta.target) ? error.meta.target.join(', ') : error.meta.target;
            return res.status(409).json({ error: `User with this ${field} already exists.` });
        }
        // Handle DriverAdapterError nested case
        if (error.code === 'P2002' && error.meta?.driverAdapterError?.cause?.constraint?.fields) {
            const field = error.meta.driverAdapterError.cause.constraint.fields.join(', ');
            return res.status(409).json({ error: `User with this ${field} already exists.` });
        }

        console.error('Error message:', error.message);
        res.status(500).json({ error: error.message || 'Failed to create user', details: error });
    }
};

export const getUsers = async (req: Request, res: Response) => {
    try {
        const { group_id } = req.query;
        const where: any = {};

        if (group_id) {
            where.group_id = parseInt(group_id as string);
        }

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // Today's range for attendance check
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);

        const users = await prisma.user.findMany({
            where,
            include: {
                group: true,
                subscriptions: {
                    where: { status: 'ACTIVE' },
                    include: { plan: true },
                    take: 1
                },
                fee_ledger: {
                    where: {
                        type: 'SUBSCRIPTION',
                        transaction_type: 'CREDIT',
                        date: { gte: startOfMonth }
                    }
                },
                attendances: {
                    where: {
                        date: {
                            gte: startOfToday,
                            lte: endOfToday
                        }
                    },
                    take: 1
                }
            },
            orderBy: { name: 'asc' }
        });

        const enhancedUsers = users.map(user => {
            const sub = user.subscriptions[0];
            const plan = sub?.plan;
            let status = 'N/A';
            let planName = 'No Plan';

            if (plan) {
                planName = plan.name;
                if (plan.rate_monthly && plan.rate_monthly > 0) {
                    const hasPayment = user.fee_ledger.length > 0;
                    status = hasPayment ? 'ACTIVE' : 'EXPIRED';
                } else {
                    status = 'ACTIVE';
                }
            }

            // Attendance Status
            // NONE = Not checked in
            // IN = Checked In (no out time)
            // OUT = Checked Out (out time exists)
            const attendance = user.attendances[0];
            let punchStatus = 'NONE';
            if (attendance) {
                if (attendance.out_time) punchStatus = 'OUT';
                else punchStatus = 'IN';
            }

            return {
                ...user,
                plan_name: planName,
                subscription_status: status,
                punch_status: punchStatus,
                todays_attendance_id: attendance?.id
            };
        });

        res.json(enhancedUsers);
    } catch (error) {
        console.error('Error fetching users:', error);
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

export const updateUser = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, phone, email, role, group_id, age, user_type } = req.body;

        const user = await prisma.user.update({
            where: { id: parseInt(id) },
            data: {
                name,
                phone,
                email: email && email.trim() !== '' ? email : null,
                role,
                group_id: group_id ? parseInt(group_id) : null,
                age: age ? parseInt(age) : null,
                user_type
            },
        });
        res.json(user);
    } catch (error: any) {
        console.error('Error updating user:', error);
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'User with this phone/email already exists' });
        }
        res.status(500).json({ error: 'Failed to update user' });
    }
};

export const deleteUser = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.user.delete({
            where: { id: parseInt(id) },
        });
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
};
