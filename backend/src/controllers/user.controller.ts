import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';
import bcrypt from 'bcrypt';

export const createUser = async (req: Request, res: Response) => {
    try {
        const { name, phone, email, role, group_id, age, user_type, plan_id, payment_frequency, password } = req.body;

        if (!phone || !/^\d{10}$/.test(phone)) {
            return res.status(400).json({ error: 'Phone number must be exactly 10 digits.' });
        }

        let hashedPassword = null;
        if (password && password.trim() !== '') {
            hashedPassword = await bcrypt.hash(password, 10);
        }

        const user = await prisma.user.create({
            data: {
                name,
                phone,
                email: email && email.trim() !== '' ? email : null,
                role,
                group_id: group_id ? parseInt(group_id) : null,
                age: age ? parseInt(age) : null,
                user_type,
                password: hashedPassword
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
                        amount_paid: 0,
                        payment_frequency: payment_frequency || 'MONTHLY'
                    }
                });

                // Financial Logic: Initial Charges
                const frequency = payment_frequency || 'MONTHLY';

                // 1. Initial Monthly Fee Debit (ONLY if Monthly Frequency selected)
                if (frequency === 'MONTHLY' && plan.rate_monthly && plan.rate_monthly > 0) {
                    await prisma.feeLedger.create({
                        data: {
                            user_id: user.id,
                            type: 'MONTHLY_FEE',
                            transaction_type: 'DEBIT',
                            amount: plan.rate_monthly,
                            is_paid: false,
                            notes: `Initial Monthly Fee (Plan: ${plan.name})`
                        }
                    });
                }

                // If Daily, we charge nothing now. It will be charged on Attendance Punch-In.
            }
        }

        res.status(201).json(user);
    } catch (error: any) {
        console.error('Error creating user FULL DETIALS:', JSON.stringify(error, null, 2));

        if (error.code === 'P2002' && error.meta?.target) {
            const field = Array.isArray(error.meta.target) ? error.meta.target.join(', ') : error.meta.target;
            return res.status(409).json({ error: `User with this ${field} already exists.` });
        }
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
                    select: { amount: true, transaction_type: true }
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
                    // This logic was weak (checking specific recent payment), 
                    // ideally we rely on subscription status or simply balance.
                    // Returning existing logic for consistency but can be improved.
                    status = user.fee_ledger.some(l => l.transaction_type === 'CREDIT') ? 'ACTIVE' : 'EXPIRED';
                    // Re-evaluate 'EXPIRED' logic if needed, but primarily focusing on Balance now.
                    status = sub.status; 
                } else {
                    status = 'ACTIVE';
                }
            }

            // Financial Balance Calculation
            let totalDebits = 0;
            let totalCredits = 0;
            user.fee_ledger.forEach(t => {
                if (t.transaction_type === 'DEBIT') totalDebits += t.amount;
                else if (t.transaction_type === 'CREDIT') totalCredits += t.amount;
            });
            const balance = totalDebits - totalCredits;

            // Attendance Status
            const attendance = user.attendances[0];
            let punchStatus = 'NONE';
            if (attendance) {
                if (attendance.out_time) punchStatus = 'OUT';
                else punchStatus = 'IN';
            }

            // Remove large ledger array from response to save bandwidth
            const { fee_ledger, ...userWithoutLedger } = user;

            return {
                ...userWithoutLedger,
                plan_name: planName,
                subscription_status: status,
                punch_status: punchStatus,
                todays_attendance_id: attendance?.id,
                balance,
                total_debits: totalDebits,
                total_credits: totalCredits
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
            include: {
                group: true,
                subscriptions: true,
                fee_ledger: true // Keep full ledger for details view
            },
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        let totalDebits = 0;
        let totalCredits = 0;
        user.fee_ledger.forEach(t => {
            if (t.transaction_type === 'DEBIT') totalDebits += t.amount;
            else if (t.transaction_type === 'CREDIT') totalCredits += t.amount;
        });
        const balance = totalDebits - totalCredits;

        res.json({ ...user, balance, total_debits: totalDebits, total_credits: totalCredits });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch user' });
    }
};

export const updateUser = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, phone, email, role, group_id, age, user_type, plan_id, payment_frequency, password } = req.body;

        if (phone && !/^\d{10}$/.test(phone)) {
            return res.status(400).json({ error: 'Phone number must be exactly 10 digits.' });
        }

        let hashedPassword = undefined; // Use undefined so it's not included in update if not provided
        if (password && password.trim() !== '') {
            hashedPassword = await bcrypt.hash(password, 10);
        }

        const user = await prisma.user.update({
            where: { id: parseInt(id) },
            data: {
                name,
                phone,
                email: email && email.trim() !== '' ? email : null,
                role,
                group_id: group_id ? parseInt(group_id) : null,
                age: age ? parseInt(age) : null,
                user_type,
                ...(hashedPassword && { password: hashedPassword }) // Conditionally add password to update data
            },
        });

        // Update Plan / Subscription if provided
        if (plan_id) {
            // Check active subscription
            const activeSub = await prisma.subscription.findFirst({
                where: { user_id: user.id, status: 'ACTIVE' }
            });

            if (activeSub) {
                // If plan or frequency changed, update it
                if (activeSub.plan_id !== parseInt(plan_id) || (payment_frequency && activeSub.payment_frequency !== payment_frequency)) {
                    // Update existing to EXPIRED (or just update in place? Standard is history, but for simplicity update)
                    // For audit, let's Deactivate old and Create new.
                    await prisma.subscription.update({
                        where: { id: activeSub.id },
                        data: { status: 'EXPIRED', end_date: new Date() }
                    });

                    // Create new
                    await prisma.subscription.create({
                        data: {
                            user_id: user.id,
                            plan_id: parseInt(plan_id),
                            start_date: new Date(),
                            status: 'ACTIVE',
                            amount_paid: 0,
                            payment_frequency: payment_frequency || 'MONTHLY' // Default to monthly if not sent
                        }
                    });
                    // NOTE: Should we charge pro-rated or new monthly fee? 
                    // For now, skipping auto-charge on update to avoid accidental double billing.
                }
            } else {
                // No active sub, create new
                await prisma.subscription.create({
                    data: {
                        user_id: user.id,
                        plan_id: parseInt(plan_id),
                        start_date: new Date(),
                        status: 'ACTIVE',
                        amount_paid: 0,
                        payment_frequency: payment_frequency || 'MONTHLY'
                    }
                });
            }
        }

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
        const userId = parseInt(id);

        const targetUser = await prisma.user.findUnique({ where: { id: userId } });
        if (!targetUser) return res.status(404).json({ error: 'User not found' });

        // PROTECT LAST MANAGEMENT USER
        if (targetUser.role === 'MANAGEMENT') {
            const adminCount = await prisma.user.count({ where: { role: 'MANAGEMENT' } });
            if (adminCount <= 1) {
                return res.status(409).json({ error: 'Cannot delete the last Management user. Please create another Management user first.' });
            }
        }

        await prisma.$transaction(async (tx) => {
            // 1. Delete Financial & Attendance Records
            await tx.userFine.deleteMany({ where: { user_id: userId } });
            await tx.attendance.deleteMany({ where: { user_id: userId } });

            // Delete child ledgers
            await tx.feeLedger.deleteMany({ where: { user_id: userId } });

            await tx.subscription.deleteMany({ where: { user_id: userId } });
            await tx.teamPlayer.deleteMany({ where: { user_id: userId } });

            // Note: We are NOT deleting BallEvent, Match Awards etc. 
            // If user has match history, this might still fail, which is good for data integrity.

            // 2. Delete User
            await tx.user.delete({
                where: { id: userId },
            });
        });

        res.json({ message: 'User and related data deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting user:', error);
        if (error.code === 'P2003') {
            res.status(409).json({ error: 'Cannot delete user: They have linked match history (Bowling/Batting/Awards) which must be preserved.' });
        } else {
            res.status(500).json({ error: 'Failed to delete user', details: error.message });
        }
    }
};
