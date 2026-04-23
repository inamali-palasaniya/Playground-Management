import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma.js';
import bcrypt from 'bcrypt';
import { AuditService } from '../services/audit.service.js';
import ExcelJS from 'exceljs';

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
        const { group_id, user_type, filter, status, punch_status, role, plan_id, payment_frequency, plan_name, donationStatus } = req.query;
        console.log('getUsers Query:', { group_id, user_type, filter, role, plan_id, payment_frequency, plan_name, donationStatus });
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

        // Filter by Plan properties (ID, Name, Frequency) via active subscription
        if (plan_id || plan_name || payment_frequency) {
            where.subscriptions = {
                some: {
                    ...(plan_id ? { plan_id: parseInt(plan_id as string) } : {}),
                    ...(plan_name ? { 
                        plan: { 
                            name: { 
                                contains: plan_name as string, 
                                mode: 'insensitive' 
                            } 
                        } 
                    } : {}),
                    ...(payment_frequency ? { payment_frequency: payment_frequency as any } : {}),
                    status: 'ACTIVE'
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

        console.log('getUsers WHERE clause:', JSON.stringify(where, null, 2));

        const users = await prisma.user.findMany({
            where,
            include: {
                group: true,
                subscriptions: {
                    orderBy: { createdAt: 'desc' },
                    include: { plan: true },
                    take: 1
                },
                permissions: true,
                created_by: { select: { name: true } },
                attendances: {
                    where: {
                        date: { gte: startOfToday, lte: endOfToday }
                    },
                    orderBy: { in_time: 'desc' },
                    take: 1
                }
            },
            orderBy: { name: 'asc' }
        });

        // Bulk Fetch Balances for these users
        const userIds = users.map(u => u.id);
        
        const debits = await prisma.feeLedger.groupBy({
            by: ['user_id'],
            where: { user_id: { in: userIds }, transaction_type: 'DEBIT' },
            _sum: { amount: true }
        });

        const credits = await prisma.feeLedger.groupBy({
            by: ['user_id'],
            where: { user_id: { in: userIds }, transaction_type: 'CREDIT' },
            _sum: { amount: true }
        });

        // Check current month subscription payments in bulk
        const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const paidSubs = await prisma.feeLedger.findMany({
            where: {
                user_id: { in: userIds },
                transaction_type: 'CREDIT',
                type: 'SUBSCRIPTION',
                date: { gte: currentMonthStart }
            },
            select: { user_id: true }
        });

        const paidToday = await prisma.feeLedger.findMany({
            where: {
                user_id: { in: userIds },
                transaction_type: 'CREDIT',
                date: { gte: startOfToday, lte: endOfToday }
            },
            select: { user_id: true }
        });

        const debitMap = new Map(debits.map(d => [d.user_id, d._sum.amount || 0]));
        const creditMap = new Map(credits.map(c => [c.user_id, c._sum.amount || 0]));
        const paidSubSet = new Set(paidSubs.map(ps => ps.user_id));
        const paidTodaySet = new Set(paidToday.map(pt => pt.user_id));

        // Donation Aggregations (Strictly DONATION type)
        const donationDebits = await prisma.feeLedger.groupBy({
            by: ['user_id'],
            where: { user_id: { in: userIds }, transaction_type: 'DEBIT', type: 'DONATION' },
            _sum: { amount: true }
        });
        const donationCredits = await prisma.feeLedger.groupBy({
            by: ['user_id'],
            where: { user_id: { in: userIds }, transaction_type: 'CREDIT', type: 'DONATION' },
            _sum: { amount: true }
        });

        const donationDebitMap = new Map(donationDebits.map(d => [d.user_id, d._sum.amount || 0]));
        const donationCreditMap = new Map(donationCredits.map(c => [c.user_id, c._sum.amount || 0]));

        const enhancedUsers = users.map(user => {
            const sub = user.subscriptions[0];
            const plan = sub?.plan;
            let subStatus = sub?.status || 'N/A';
            let planName = plan?.name || 'No Plan';
            let paymentFrequency = sub?.payment_frequency || null;

            if (plan && !plan.rate_monthly) {
                subStatus = 'ACTIVE';
            }

            // Financial Totals from Maps
            const totalDebits = debitMap.get(user.id) || 0;
            const totalCredits = creditMap.get(user.id) || 0;
            const balance = totalDebits - totalCredits;

            const donationDebit = donationDebitMap.get(user.id) || 0;
            const donationCredit = donationCreditMap.get(user.id) || 0;

            // Filters applied after calculation
            if (filter === 'NEGATIVE_BALANCE' && balance <= 0) return null;
            if (filter === 'SETTLED' && balance > 0) return null;

            if (donationStatus) {
                const totalDonation = donationDebit + donationCredit;
                const isDonor = donationDebit > 0 || donationCredit > 0;
                
                if (donationStatus === 'DONOR' && !isDonor) return null;
                if (donationStatus === 'PENDING' && (!donationDebit || donationCredit >= donationDebit)) return null;
                if (donationStatus === 'PAID') {
                    const isFullyPaid = (donationDebit > 0 && donationCredit >= donationDebit) || (donationDebit === 0 && donationCredit > 0);
                    if (!isFullyPaid) return null;
                }
            }

            return {
                ...user,
                plan_name: planName,
                subscription_status: subStatus,
                balance,
                total_debits: totalDebits,
                total_credits: totalCredits,
                todays_attendance_id: user.attendances[0]?.id || null,
                punch_status: user.attendances[0] ? (user.attendances[0].out_time ? 'OUT' : 'IN') : 'NONE',
                payment_frequency: paymentFrequency,
                plan_rate: paymentFrequency === 'DAILY' ? (plan?.rate_daily || 0) : (plan?.rate_monthly || 0),
                is_subscription_paid: paidSubSet.has(user.id),
                is_paid_today: paidTodaySet.has(user.id),
                donation_debit: donationDebit,
                donation_credit: donationCredit,
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
                    orderBy: { createdAt: 'desc' },
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
        let paymentFrequency = sub?.payment_frequency || null;

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
            payment_frequency: paymentFrequency,
            plan_rate: paymentFrequency === 'DAILY' ? (plan?.rate_daily || 0) : (plan?.rate_monthly || 0),
            is_subscription_paid: user.fee_ledger.some(t =>
                t.transaction_type === 'CREDIT' &&
                t.type === 'SUBSCRIPTION' &&
                new Date(t.date) >= new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            ),
            is_paid_today: user.fee_ledger.some(t =>
                t.transaction_type === 'CREDIT' &&
                new Date(t.date) >= startOfToday &&
                new Date(t.date) <= endOfToday
            ),
            donation_debit: user.fee_ledger
                .filter(t => t.transaction_type === 'DEBIT' && (t.type === 'DONATION' || t.type === 'DEPOSIT'))
                .reduce((sum, t) => sum + t.amount, 0),
            donation_credit: user.fee_ledger
                .filter(t => t.transaction_type === 'CREDIT' && (t.type === 'DONATION' || t.type === 'DEPOSIT'))
                .reduce((sum, t) => sum + t.amount, 0),
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
        let { name, phone, email, role, group_id, age, user_type, plan_id, payment_frequency, password, is_active, permissions } = req.body;

        if (phone && !/^\d{10}$/.test(phone)) {
            return res.status(400).json({ error: 'Phone number must be exactly 10 digits.' });
        }

        const existingUser = await prisma.user.findUnique({ where: { id: parseInt(id) } });
        if (!existingUser) return res.status(404).json({ error: 'User not found' });

        const currentUser = (req as any).user;
        const isSelfUpdate = currentUser && currentUser.userId === existingUser.id;

        // PROTECT SUPER ADMIN
        const isSuperAdminTarget = existingUser.email === '91inamali@gmail.com' || existingUser.role === 'SUPER_ADMIN';

        if (isSuperAdminTarget) {
            const isRoleChanging = role !== undefined && role !== existingUser.role;
            const isActiveChanging = is_active !== undefined && is_active !== existingUser.is_active;

            if (isRoleChanging || isActiveChanging) {
                return res.status(403).json({ error: 'Cannot modify Super Admin permissions, role, or active status.' });
            }

            role = undefined;
            is_active = undefined;
            permissions = undefined;
        } else if (isSelfUpdate) {
            // A user cannot change their own privileges, role or active status.
            const isRoleChanging = role !== undefined && role !== existingUser.role;
            const isActiveChanging = is_active !== undefined && is_active !== existingUser.is_active;
            const isPermissionsChanging = permissions !== undefined;

            if (isRoleChanging || isActiveChanging || isPermissionsChanging) {
                return res.status(403).json({ 
                    error: 'Self-modification Restricted',
                    message: 'You cannot modify your own role, active status, or permissions. Please contact another administrator.' 
                });
            }
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
        if (currentUser && currentUser.userId === user.id) {
            // Using fresh jwt payload
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
        await AuditService.logUpdate('USER', user.id, performedBy, existingUser, updateData);

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

export const exportUsers = async (req: Request, res: Response) => {
    try {
        const users = await prisma.user.findMany({
            include: {
                group: true,
                subscriptions: {
                    include: { plan: true }
                }
            }
        });

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Users');

        sheet.columns = [
            { header: 'user_id', key: 'user_id', width: 10 },
            { header: 'name', key: 'name', width: 20 },
            { header: 'phone', key: 'phone', width: 15 },
            { header: 'email', key: 'email', width: 25 },
            { header: 'role', key: 'role', width: 15 },
            { header: 'group_id', key: 'group_id', width: 10 },
            { header: 'age', key: 'age', width: 10 },
            { header: 'user_type', key: 'user_type', width: 15 },
            { header: 'plan_id', key: 'plan_id', width: 10 },
            { header: 'payment_frequency', key: 'payment_frequency', width: 15 },
            { header: 'password', key: 'password', width: 20 },
            { header: 'is_active', key: 'is_active', width: 10 }
        ];

        users.forEach(user => {
            const activeSub = user.subscriptions?.find((sub: any) => sub.status === 'ACTIVE');
            sheet.addRow({
                user_id: user.id,
                name: user.name,
                phone: user.phone,
                email: user.email,
                role: user.role,
                group_id: user.group_id,
                age: user.age,
                user_type: user.user_type,
                plan_id: activeSub?.plan_id || null,
                payment_frequency: (user as any).payment_frequency,
                password: '', // leave empty, only used for import
                is_active: user.is_active
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=users.xlsx');

        await workbook.xlsx.write(res);
        res.end();
    } catch (error: any) {
        console.error('Error exporting users:', error);
        res.status(500).json({ error: 'Failed to export users', details: error.message });
    }
};

export const importUsers = async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No Excel file uploaded.' });
        }

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(req.file.buffer as any);

        const sheet = workbook.getWorksheet(1);
        if (!sheet) {
            return res.status(400).json({ error: 'Excel file is empty or invalid.' });
        }

        const rows: any[] = [];
        sheet.eachRow((row, rowNumber) => {
            if (rowNumber > 1) { // Skip header
                const rowData = {
                    user_id: row.getCell(1).value?.toString()?.trim() || null,
                    name: row.getCell(2).value?.toString()?.trim() || null,
                    phone: row.getCell(3).value?.toString()?.trim() || null,
                    email: row.getCell(4).value?.toString()?.trim() || null,
                    role: row.getCell(5).value?.toString()?.trim() || null,
                    group_id: row.getCell(6).value?.toString()?.trim() || null,
                    age: row.getCell(7).value?.toString()?.trim() || null,
                    user_type: row.getCell(8).value?.toString()?.trim() || null,
                    plan_id: row.getCell(9).value?.toString()?.trim() || null,
                    payment_frequency: row.getCell(10).value?.toString()?.trim() || null,
                    password: row.getCell(11).value?.toString()?.trim() || null,
                    is_active: row.getCell(12).value?.toString()?.trim() || null,
                    commit_deposit: parseFloat(row.getCell(13).value?.toString()?.trim() || '0'),
                    paid_deposit: parseFloat(row.getCell(14).value?.toString()?.trim() || '0')
                };
                rows.push(rowData);
            }
        });

        let createdCount = 0;
        let updatedCount = 0;
        const performedBy = (req as any).user?.userId || 1;

        for (const data of rows) {
            if (!data.name || !data.phone) {
                continue; // Skip invalid rows
            }

            let hashedPassword = undefined;
            if (data.password) {
                hashedPassword = await bcrypt.hash(data.password, 10);
            }

            let role = 'NORMAL';
            if (data.role && data.role.toUpperCase() === 'MANAGEMENT') {
                role = 'MANAGEMENT';
            } else if (data.role && data.role.toUpperCase() === 'NORMAL') {
                role = 'NORMAL';
            }

            // Determine permissions based on role
            let permissions: any[] = [];
            if (role === 'MANAGEMENT') {
                const modules = ['dashboard', 'user', 'attendance', 'finance', 'tournament', 'expense', 'report', 'notification', 'settings', 'role'];
                permissions = modules.map(mod => ({
                    module_name: mod,
                    can_view: true,
                    can_add: true,
                    can_edit: true,
                    can_delete: true
                }));
            } else {
                permissions = [
                    { module_name: 'dashboard', can_view: true, can_add: false, can_edit: false, can_delete: false },
                    { module_name: 'user', can_view: true, can_add: false, can_edit: false, can_delete: false }
                ];
            }

            const userData: any = {
                name: data.name,
                phone: data.phone,
                email: data.email || null,
                role: role,
                group_id: data.group_id ? parseInt(data.group_id) : null,
                age: data.age ? parseInt(data.age) : null,
                user_type: data.user_type || 'PLAYER',
                payment_frequency: data.payment_frequency || 'MONTHLY',
                is_active: data.is_active === 'false' ? false : true
            };

            if (hashedPassword) {
                userData.password = hashedPassword;
            }

            if (data.user_id) {
                // Update existing user
                const userId = parseInt(data.user_id);
                const existingUser = await prisma.user.findUnique({ where: { id: userId } });
                
                if (existingUser) {
                    await prisma.user.update({
                        where: { id: userId },
                        data: userData
                    });

                    // Update permissions
                    await prisma.permission.deleteMany({ where: { user_id: userId } });
                    if (permissions.length > 0) {
                        await prisma.permission.createMany({
                            data: permissions.map(p => ({
                                user_id: userId,
                                ...p
                            }))
                        });
                    }

                    if (data.plan_id) {
                         const planIdInt = parseInt(data.plan_id);
                         const activeSub = await prisma.subscription.findFirst({
                            where: { user_id: userId, status: 'ACTIVE' }
                         });
                         if (!activeSub || activeSub.plan_id !== planIdInt) {
                             if (activeSub) {
                                 await prisma.subscription.update({ where: { id: activeSub.id }, data: { status: 'CANCELLED' } });
                             }
                             await prisma.subscription.create({
                                 data: {
                                     user_id: userId,
                                     plan_id: planIdInt,
                                     status: 'ACTIVE',
                                     start_date: new Date(),
                                     amount_paid: 0
                                 }
                             });
                         }
                    }

                    await AuditService.logAction('USER', userId, 'UPDATE', performedBy, { note: 'Updated via Excel Import' });
                    updatedCount++;
                }
            } else {
                // Create new user
                const user = await prisma.user.create({
                    data: {
                        ...userData,
                        created_by_id: performedBy,
                        permissions: {
                            create: permissions
                        }
                    }
                });

                if (data.plan_id) {
                     await prisma.subscription.create({
                         data: {
                             user_id: user.id,
                             plan_id: parseInt(data.plan_id),
                             status: 'ACTIVE',
                             start_date: new Date(),
                             amount_paid: 0
                         }
                     });
                }

                // Handle Deposit Commitment & Payment for NEW users
                if (data.commit_deposit > 0) {
                    const debitEntry = await prisma.feeLedger.create({
                        data: {
                            user_id: user.id,
                            type: 'DONATION',
                            transaction_type: 'DEBIT',
                            amount: data.commit_deposit,
                            date: new Date(),
                            notes: 'Initial Deposit Commitment (Import)',
                            is_paid: data.paid_deposit >= data.commit_deposit,
                            created_by_id: performedBy
                        }
                    });

                    if (data.paid_deposit > 0) {
                        await prisma.feeLedger.create({
                            data: {
                                user_id: user.id,
                                type: 'DEPOSIT',
                                transaction_type: 'CREDIT',
                                amount: data.paid_deposit,
                                date: new Date(),
                                parent_ledger_id: debitEntry.id,
                                notes: 'Initial Deposit Payment (Import)',
                                payment_method: 'CASH',
                                created_by_id: performedBy
                            }
                        });
                    }
                }

                await AuditService.logAction('USER', user.id, 'CREATE', performedBy, { note: 'Created via Excel Import' });
                createdCount++;
            }
        }

        res.json({ message: 'Excel import completed', created: createdCount, updated: updatedCount });
    } catch (error: any) {
        console.error('Error importing users:', error);
        res.status(500).json({ error: 'Failed to import users', details: error.message });
    }
};

