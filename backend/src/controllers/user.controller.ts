import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';
import bcrypt from 'bcrypt';
import { AuditService } from '../services/audit.service.js';

export const createUser = async (req: Request, res: Response) => {
    try {
        const { name, phone, email, role, group_id, age, user_type, plan_id, payment_frequency, password, is_active, permissions } = req.body;

        if (!phone || !/^\d{10}$/.test(phone)) {
            return res.status(400).json({ error: 'Phone number must be exactly 10 digits.' });
        }

        let hashedPassword = null;
        if (password && password.trim() !== '') {
            hashedPassword = await bcrypt.hash(password, 10);
        }

        const userData: any = {
            name,
            phone,
            email: email && email.trim() !== '' ? email : null,
            role,
            group_id: group_id ? parseInt(group_id) : null,
            age: age ? parseInt(age) : null,
            user_type,
            password: hashedPassword,
            is_active: is_active !== undefined ? is_active : true
        };

        // If email is 91inamali@gmail.com, FORCE SUPER_ADMIN role and permissions
        if (userData.email === '91inamali@gmail.com') {
            userData.role = 'SUPER_ADMIN';
            userData.is_active = true;
        }

        const user = await prisma.user.create({
            data: {
                ...userData,
                created_by_id: (req as any).user?.userId || null,
                permissions: {
                    create: Array.isArray(permissions) ? permissions.map((p: any) => ({
                        module_name: p.module_name,
                        can_view: p.can_view || false,
                        can_add: p.can_add || false,
                        can_edit: p.can_edit || false,
                        can_delete: p.can_delete || false
                    })) : []
                }
            },
            include: { permissions: true }
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
                            notes: `Initial Monthly Fee (Plan: ${plan.name})`,
                            created_by_id: (req as any).user?.userId || null
                        }
                    });
                }

                // If Daily, we charge nothing now. It will be charged on Attendance Punch-In.
            }
        }

        // AUDIT LOG
        const performedBy = (req as any).user?.userId || 1; // Default to 1 (Admin) if system/seed
        await AuditService.logAction('USER', user.id, 'CREATE', performedBy, {
            name: user.name,
            email: user.email,
            role: user.role,
            plan_id
        });

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
        const { group_id, user_type, filter, status, punch_status, role, plan_id } = req.query;
        const where: any = {};

        if (group_id) {
            where.group_id = parseInt(group_id as string);
        }

        if (role) {
            where.role = role;
        }

        if (user_type) {
            where.user_type = user_type;
        }

        // Filter by specific plan (via plan_id)
        if (plan_id) {
            // Ensure we are filtering by a plan that is currently ACTIVE or EXPIRED for the user
            // Actually, usually filters imply "Users who HAVE this plan"
            where.subscriptions = {
                some: {
                    plan_id: parseInt(plan_id as string)
                    // We might want to filter only active? or any status? 
                    // Let's assume generally users currently associated with this plan.
                }
            };
        }

        // Special EXPIRED filter override or combination
        if (filter === 'EXPIRED') {
            where.subscriptions = {
                some: {
                    status: 'EXPIRED',
                    plan: {
                        name: { contains: 'Monthly', mode: 'insensitive' }
                    }
                }
            };
        } else if (filter === 'UPCOMING_EXPIRY') {
            const andThreeDays = new Date();
            andThreeDays.setDate(andThreeDays.getDate() + 3);
            where.subscriptions = {
                some: {
                    status: 'ACTIVE',
                    end_date: {
                        gte: new Date(),
                        lte: andThreeDays
                    }
                }
            };
        }

        if (status) {
            where.is_active = status === 'ACTIVE';
        }

        const now = new Date();
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);

        // Punch Status Filter
        if (punch_status === 'IN') {
            where.attendances = {
                some: {
                    date: { gte: startOfToday, lte: endOfToday },
                    out_time: null,
                    is_present: true
                }
            };
        } else if (punch_status === 'OUT') {
            // Not Currently IN (so either never punched in today, or punched out)
            where.NOT = {
                attendances: {
                    some: {
                        date: { gte: startOfToday, lte: endOfToday },
                        out_time: null,
                        is_present: true
                    }
                }
            };
        }

        const users = await prisma.user.findMany({
            where,
            include: {
                group: true,
                subscriptions: {
                    where: { status: 'ACTIVE' },
                    include: { plan: true },
                    take: 1
                },
                permissions: true,
                fee_ledger: {
                    select: { amount: true, transaction_type: true }
                },
                created_by: { select: { name: true } },
                attendances: {
                    where: {
                        date: {
                            gte: startOfToday,
                            lte: endOfToday
                        }
                    },
                    orderBy: { in_time: 'desc' },
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
                    // Subscription Logic for "EXPIRED"
                    // User Request: "If monthly subscriber are expire monthly subscription then show status expired... if current month payment not received"
                    // Existing logic already checks this roughly. Let's refine.
                    // If plan is monthly, and sub status is ACTIVE, check if current month fee is paid?
                    // actually sub.status should reflect it.
                    status = sub.status;
                } else {
                    status = 'ACTIVE';
                }
            }

            // Check for Expired Subscription Display logic
            // If subscription is expired, status should be EXPIRED.
            if (sub?.status === 'EXPIRED') {
                status = 'EXPIRED';
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

            if (filter === 'NEGATIVE_BALANCE' && balance <= 0) return null;
            if (filter === 'SETTLED' && balance > 0) return null;

            return {
                ...user,
                plan_name: planName,
                subscription_status: status,
                balance,
                total_debits: totalDebits,
                total_credits: totalCredits,
                todays_attendance_id: user.attendances[0]?.id || null,
                punch_status: user.attendances[0]?.is_present ? (user.attendances[0]?.out_time ? 'OUT' : 'IN') : 'NONE',
                created_by_name: (user as any).created_by?.name || 'System'
            };
        }).filter(u => u !== null);

        res.json(enhancedUsers);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

export const getUserById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const now = new Date();
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);

        const user = await prisma.user.findUnique({
            where: { id: Number(id) },
            include: {
                group: true,
                subscriptions: {
                    where: { status: 'ACTIVE' },
                    include: { plan: true },
                    take: 1
                },
                permissions: true,
                fee_ledger: true,
                attendances: {
                    where: {
                        date: {
                            gte: startOfToday,
                            lte: endOfToday
                        }
                    },
                    orderBy: { in_time: 'desc' },
                    take: 1
                }
            },
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Subscription & Plan Details
        const sub = user.subscriptions[0];
        const plan = sub?.plan;
        let status = 'N/A';
        let planName = 'No Plan';

        if (plan) {
            planName = plan.name;
            status = sub.status;
        }

        // Attendance Status
        const attendance = user.attendances[0];
        let punchStatus = 'NONE';
        if (attendance) {
            if (attendance.out_time) punchStatus = 'OUT';
            else punchStatus = 'IN';
        }

        // Financial Balance
        let totalDebits = 0;
        let totalCredits = 0;
        user.fee_ledger.forEach(t => {
            if (t.transaction_type === 'DEBIT') totalDebits += t.amount;
            else if (t.transaction_type === 'CREDIT') totalCredits += t.amount;
        });
        const balance = totalDebits - totalCredits;

        // Remove large ledger for clean response if needed (but existing kept it)
        // Keeping it as existing frontend might verify ledger in detail screen?
        // Actually, frontend uses getUserLedger for the tab.
        // But let's return full user object + calculated fields.

        res.json({
            ...user,
            balance,
            total_debits: totalDebits,
            total_credits: totalCredits,
            plan_name: planName,
            subscription_status: status,
            punch_status: punchStatus,
            todays_attendance_id: attendance?.id
        });
    } catch (error) {
        console.error('Error fetching user by id:', error);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
};

export const updateUser = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, phone, email, role, group_id, age, user_type, plan_id, payment_frequency, password, is_active, permissions } = req.body;

        if (phone && !/^\d{10}$/.test(phone)) {
            return res.status(400).json({ error: 'Phone number must be exactly 10 digits.' });
        }

        const existingUser = await prisma.user.findUnique({ where: { id: parseInt(id) } });
        if (!existingUser) return res.status(404).json({ error: 'User not found' });

        // PROTECT SUPER ADMIN
        // If target is Super Admin (by email or role), prevent changing critical fields by anyone (even self?)
        // User Request: "no one can change super admin type and its permission (include self super admin)"
        const isSuperAdminTarget = existingUser.email === '91inamali@gmail.com' || existingUser.role === 'SUPER_ADMIN';

        if (isSuperAdminTarget) {
            // Cancel any attempt to explicitly *change* role, permissions, active status
            // We only error if the new value is explicitly provided AND different from the current value
            // Note: permissions comparison is simplified; for Super Admin it should be considered unchanged if not provided or effectively same intent

            const isRoleChanging = role !== undefined && role !== existingUser.role;
            const isActiveChanging = is_active !== undefined && is_active !== existingUser.is_active;
            // For permissions, it's complex to compare deeply. 
            // Better strategy: simply ignore `permissions`, `role`, `is_active` fields for Super Admin in the update query 
            // rather than throwing 403, effectively "silently enforcing" the lock.
            // BUT, if the user *intent* was to change them, a 403 warning is better feedback than silent ignore.
            // Let's stick to 403 if they try to CHANGE it.

            if (isRoleChanging || isActiveChanging) {
                return res.status(403).json({ error: 'Cannot modify Super Admin permissions, role, or active status.' });
            }
            // For permissions, checking difference is hard. Let's just block strictly if permissions is sent
            // UNLESS we just strip these fields from the update object later for Super Admin?
            // "no one can change super admin type and its permission"
            // If we just DELETE these keys from the input for Super Admin, we achieve the goal safely.

            if (role !== undefined) delete req.body.role;
            if (is_active !== undefined) delete req.body.is_active;
            if (permissions !== undefined) delete req.body.permissions;
        }

        let hashedPassword = undefined;
        if (password && password.trim() !== '') {
            hashedPassword = await bcrypt.hash(password, 10);
        }

        const updateData: any = {
            name,
            phone,
            ...(email !== undefined && { email: email && email.trim() !== '' ? email : null }),
            role,
            group_id: group_id ? parseInt(group_id) : null,
            age: age ? parseInt(age) : null, // Fix: Use 'age' properly if it was missing 
            user_type,
            ...(hashedPassword && { password: hashedPassword }),
            ...(is_active !== undefined && { is_active })
        };

        // Filter undefined
        Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

        // Transaction for permissions update
        const user = await prisma.$transaction(async (tx) => {
            // Update User
            const updated = await tx.user.update({
                where: { id: parseInt(id) },
                data: updateData,
                include: { permissions: true }
            });

            // Update Permissions if provided
            if (permissions && Array.isArray(permissions)) {
                // Delete existing
                await tx.permission.deleteMany({ where: { user_id: parseInt(id) } });

                // Create new
                // If user is MANAGEMENT only? No, we just set what is requested. Middleware checks who is REQUESTING.
                // WE assume the caller has permission to set these.
                if (permissions.length > 0) {
                    await tx.permission.createMany({
                        data: permissions.map((p: any) => ({
                            user_id: parseInt(id),
                            module_name: p.module_name,
                            can_view: p.can_view || false,
                            can_add: p.can_add || false,
                            can_edit: p.can_edit || false,
                            can_delete: p.can_delete || false
                        }))
                    });
                }
            }

            return updated;
        });

        // Refetch to get fresh permissions if we just updated them
        const finalUser = await prisma.user.findUnique({
            where: { id: parseInt(id) },
            include: { permissions: true }
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

        // If the user updated themselves, issue a new token to reflect potential role/email changes
        let newToken = undefined;
        const currentUser = (req as any).user;
        if (currentUser && currentUser.userId === user.id) {
            // Using direct jwt sign to ensure circular deps don't break simple controller logic
            const jwt = require('jsonwebtoken'); // Import at top ideally, but ensuring safety here
            const JWT_SECRET = process.env.JWT_SECRET;
            if (!JWT_SECRET) {
                throw new Error('JWT_SECRET is not defined in environment variables');
            }
            newToken = jwt.sign(
                { userId: user.id, email: user.email, role: user.role }, // Fresh Payload
                JWT_SECRET,
                { expiresIn: '24h' }
            );
        }

        // AUDIT LOG
        const performedBy = (req as any).user?.userId || 1;
        // masked data for log
        const logDetail = { ...updateData };
        delete logDetail.password;

        await AuditService.logAction('USER', user.id, 'UPDATE', performedBy, logDetail);

        res.json({ ...user, token: newToken });
    } catch (error: any) {
        console.error('Error updating user:', error);
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'User with this phone/email already exists' });
        }
        res.status(500).json({ error: 'Failed to update user' });
    }
};

export const updatePushToken = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const { pushToken } = req.body;

        if (!pushToken) return res.status(400).json({ error: 'Push Token required' });

        await prisma.user.update({
            where: { id: parseInt(userId) },
            data: { push_token: pushToken }
        });

        res.json({ message: 'Push token updated' });
    } catch (error) {
        console.error('Error updating push token:', error);
        res.status(500).json({ error: 'Failed to update push token' });
    }
};

export const deleteUser = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = parseInt(id);

        const targetUser = await prisma.user.findUnique({ where: { id: userId } });
        if (!targetUser) return res.status(404).json({ error: 'User not found' });

        // PROTECT LAST MANAGEMENT USER
        if (targetUser.role === 'SUPER_ADMIN') {
            throw new Error('Cannot delete the Super Admin user.');
        }

        // Hard Delete with Cascade (Prisma handles cascade if configured in schema, 
        // but we explicitly use delete here instead of update is_active=false)
        await prisma.user.delete({
            where: { id: userId }
        });

        // AUDIT LOG
        const performedBy = (req as any).user?.userId || 1;
        await AuditService.logAction('USER', userId, 'DELETE', performedBy, {
            name: targetUser.name,
            email: targetUser.email,
            phone: targetUser.phone,
            role: targetUser.role,
            action: 'HARD_DELETE',
            note: 'User permanently deleted with cascading data removal.'
        });

        res.json({ message: 'User permanently deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Failed to delete user', details: error.message });
    }
};
