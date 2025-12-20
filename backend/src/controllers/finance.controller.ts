import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';
import { AuditService } from '../services/audit.service.js';

// Add Payment (Credit) with Auto-Match Logic
// Add Payment (Credit) with Strict Linking
export const addPayment = async (req: Request, res: Response) => {
    try {
        const { user_id, amount, payment_method, notes, type, transaction_date, billing_period, link_to_id, transaction_type } = req.body;

        if (!user_id || !amount) {
            return res.status(400).json({ error: 'User ID and amount are required' });
        }

        const numericAmount = parseFloat(amount);
        const paymentDate = transaction_date ? new Date(transaction_date) : new Date();
        const txType = transaction_type || 'CREDIT';

        // Validation for Linked Payments (Partial Payment Logic)
        if (txType === 'CREDIT' && link_to_id) {
            const parent = await prisma.feeLedger.findUnique({ where: { id: parseInt(link_to_id) } });
            if (!parent) {
                return res.status(404).json({ error: 'Linked charge not found' });
            }
            if (parent.transaction_type !== 'DEBIT') {
                return res.status(400).json({ error: 'Cannot link payment to another credit' });
            }

            const existingPayments = await prisma.feeLedger.findMany({ where: { parent_ledger_id: parent.id } });
            const alreadyPaid = existingPayments.reduce((sum, p) => sum + p.amount, 0);
            const remaining = parent.amount - alreadyPaid;

            if (numericAmount > remaining) {
                return res.status(400).json({
                    error: `Payment exceeds remaining balance. Remaining: ₹${remaining}, Attempted: ₹${numericAmount}`
                });
            }
        }

        let finalNotes = notes || '';
        if (type === 'SUBSCRIPTION' && billing_period) {
            finalNotes += ` (For period: ${billing_period})`;
        }

        // Create Ledger Entry
        const entry = await prisma.feeLedger.create({
            data: {
                user_id: parseInt(user_id),
                type: type || (txType === 'DEBIT' ? 'MANUAL_FEE' : 'PAYMENT'),
                transaction_type: txType,
                payment_method: txType === 'CREDIT' ? (payment_method || 'CASH') : undefined,
                amount: numericAmount,
                date: paymentDate,
                is_paid: txType === 'CREDIT',
                notes: finalNotes ? finalNotes.trim() : undefined,
                parent_ledger_id: (txType === 'CREDIT' && link_to_id) ? parseInt(link_to_id) : undefined,
                created_by_id: (req as any).user?.userId || null
            }
        });

        // Post-Creation: Update Parent Status if fully paid
        if (txType === 'CREDIT' && link_to_id) {
            const parent = await prisma.feeLedger.findUnique({ where: { id: parseInt(link_to_id) } });
            if (parent) {
                const allChildren = await prisma.feeLedger.findMany({ where: { parent_ledger_id: parent.id } });
                const totalPaid = allChildren.reduce((sum, child) => sum + child.amount, 0);

                // Allow small floating point error epsilon if needed, but strict equality is usually okay for currency if integers/fixed.
                // Using >= to be safe.
                if (totalPaid >= parent.amount) {
                    await prisma.feeLedger.update({
                        where: { id: parent.id },
                        data: { is_paid: true } // Mark Parent as Paid
                    });
                }
            }
        }

        // Removed Auto-Match Logic as per new requirement

        const performedBy = (req as any).user?.userId || 1;
        await AuditService.logAction('PAYMENT', entry.id, 'CREATE', performedBy, { amount, notes, type: txType });

        res.status(201).json(entry);
    } catch (error: any) {
        console.error('Error adding payment:', error);
        res.status(500).json({ error: error.message || 'Failed to add payment' });
    }
};

// Charge Monthly Fee (Manual Trigger for now)
export const chargeMonthlyFee = async (req: Request, res: Response) => {
    try {
        const { user_id } = req.body;
        const now = new Date();

        // 1. Get Active Subscription
        const subscription = await prisma.subscription.findFirst({
            where: {
                user_id: parseInt(user_id),
                status: 'ACTIVE',
                OR: [{ end_date: null }, { end_date: { gte: now } }]
            },
            include: { plan: true }
        });

        if (!subscription || !subscription.plan.rate_monthly || subscription.plan.rate_monthly <= 0) {
            return res.status(400).json({ error: 'No active monthly subscription found with a valid rate.' });
        }

        const plan = subscription.plan;
        const date = new Date(); // Charge date

        // 1.5. Check for existing charge this month (Idempotency)
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        const existingCharge = await prisma.feeLedger.findFirst({
            where: {
                user_id: parseInt(user_id),
                type: 'MONTHLY_FEE',
                transaction_type: 'DEBIT',
                date: {
                    gte: startOfMonth,
                    lte: endOfMonth
                }
            }
        });

        if (existingCharge) {
            return res.status(409).json({
                error: 'Monthly fee already charged for this month.',
                existing: existingCharge
            });
        }

        // 2. Check for Split Logic
        // If Plan has monthly_deposit_part > 0 AND User deposit < 2000 (Target)
        const user = await prisma.user.findUnique({ where: { id: parseInt(user_id) } });

        // Use non-null assertion or fallback because we checked rate_monthly above
        let feePart = plan.rate_monthly || 0;
        let depositPart = 0;

        if (plan.monthly_deposit_part && plan.monthly_deposit_part > 0 && user && user.deposit_amount < 2000) {
            depositPart = plan.monthly_deposit_part;
            feePart = (plan.rate_monthly || 0) - depositPart;
        }

        const debits = [];

        // 3. Create Debits
        if (feePart > 0) {
            const feeDebit = await prisma.feeLedger.create({
                data: {
                    user_id: parseInt(user_id),
                    type: 'MONTHLY_FEE',
                    transaction_type: 'DEBIT',
                    amount: feePart,
                    is_paid: false,
                    notes: `Monthly Fee for ${date.toLocaleString('default', { month: 'long', year: 'numeric' })}`
                }
            });
            debits.push(feeDebit);
        }

        if (depositPart > 0) {
            const depositDebit = await prisma.feeLedger.create({
                data: {
                    user_id: parseInt(user_id),
                    type: 'DEPOSIT',
                    transaction_type: 'DEBIT',
                    amount: depositPart,
                    is_paid: false,
                    notes: `Deposit Installment for ${date.toLocaleString('default', { month: 'long', year: 'numeric' })}`
                }
            });
            debits.push(depositDebit);
        }

        res.status(201).json({ message: 'Monthly charges applied', debits });

        const performedBy = (req as any).user?.userId || 1;
        if (debits.length > 0) {
            await AuditService.logAction('MONTHLY_CHARGE', parseInt(user_id), 'CREATE', performedBy, { count: debits.length, debits });
        }
    } catch (error) {
        console.error('Error charging monthly fee:', error);
        res.status(500).json({ error: 'Failed to charge monthly fee' });
    }
};

// Add Fine (Debit)
export const addFine = async (req: Request, res: Response) => {
    try {
        const { user_id, rule_id, manual_amount, notes } = req.body;

        const rule = await prisma.fineRule.findUnique({ where: { id: parseInt(rule_id) } });
        if (!rule) return res.status(404).json({ error: 'Fine rule not found' });

        // Count previous fines
        const previousFines = await prisma.userFine.count({
            where: {
                user_id: parseInt(user_id),
                rule_id: parseInt(rule_id)
            }
        });

        const amount = manual_amount ? parseFloat(manual_amount) : (previousFines === 0 ? rule.first_time_fine : rule.subsequent_fine);

        // Record UserFine event
        await prisma.userFine.create({
            data: {
                user_id: parseInt(user_id),
                rule_id: parseInt(rule_id),
                amount_charged: amount,
                occurrence: previousFines + 1
            }
        });

        // Record Ledger Debit
        const ledger = await prisma.feeLedger.create({
            data: {
                user_id: parseInt(user_id),
                type: 'FINE',
                transaction_type: 'DEBIT',
                amount: amount,
                is_paid: false,
                notes: notes || `Fine: ${rule.name} (Occurrence: ${previousFines + 1})`,
                created_by_id: (req as any).user?.userId || null
            }
        });

        res.status(201).json(ledger);

        const performedBy = (req as any).user?.userId || 1;
        await AuditService.logAction('FINE', ledger.id, 'CREATE', performedBy, { amount, rule_id, notes });
    } catch (error) {
        console.error('Error adding fine:', error);
        res.status(500).json({ error: 'Failed to add fine' });
    }
};

// Get Ledger
export const getUserFinancials = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const ledger = await prisma.feeLedger.findMany({
            where: { user_id: Number(userId) },
            include: {
                child_ledger: true,
                created_by: { select: { name: true } }
            },
            orderBy: { date: 'desc' }
        });

        // Calculate Balance
        const credits = ledger.filter(l => l.transaction_type === 'CREDIT').reduce((sum, l) => sum + l.amount, 0);
        const debits = ledger.filter(l => l.transaction_type === 'DEBIT').reduce((sum, l) => sum + l.amount, 0);
        const balance = debits - credits; // Positive means user owes money

        res.json({ ledger, balance, total_credits: credits, total_debits: debits });
    } catch (error) {
        res.status(500).json({ error: 'Error fetching financials' });
    }
};

export const updateLedgerEntry = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { amount, notes, is_paid, date, type, payment_method } = req.body;
        const entryId = parseInt(id);

        // Get original to check for relations
        const original = await prisma.feeLedger.findUnique({ where: { id: entryId } });
        if (!original) return res.status(404).json({ error: 'Entry not found' });

        const updated = await prisma.feeLedger.update({
            where: { id: entryId },
            data: {
                amount: amount ? parseFloat(amount) : undefined,
                notes,
                is_paid: is_paid !== undefined ? is_paid : undefined,
                date: date ? new Date(date) : undefined,
                type: type,
                payment_method: payment_method
            }
        });

        // 1. If this is a child payment (has parent), recalculate parent status
        if (original.parent_ledger_id) {
            const parent = await prisma.feeLedger.findUnique({ where: { id: original.parent_ledger_id } });
            if (parent) {
                const siblings = await prisma.feeLedger.findMany({ where: { parent_ledger_id: parent.id } });
                const totalPaid = siblings.reduce((sum, s) => sum + s.amount, 0);
                const isNowPaid = totalPaid >= parent.amount;
                if (parent.is_paid !== isNowPaid) {
                    await prisma.feeLedger.update({ where: { id: parent.id }, data: { is_paid: isNowPaid } });
                }
            }
        }

        // 2. If this is a parent debit (has children), recalculate own status based on children
        // (Only if amount changed)
        if (amount && original.transaction_type === 'DEBIT') {
            const children = await prisma.feeLedger.findMany({ where: { parent_ledger_id: entryId } });
            if (children.length > 0) {
                const totalPaid = children.reduce((sum, c) => sum + c.amount, 0);
                const isNowPaid = totalPaid >= updated.amount;
                if (updated.is_paid !== isNowPaid) {
                    await prisma.feeLedger.update({ where: { id: entryId }, data: { is_paid: isNowPaid } });
                    updated.is_paid = isNowPaid; // reflect in response
                }
            }
        }

        res.json(updated);

        const performedBy = (req as any).user?.userId || 1;
        await AuditService.logAction('LEDGER', updated.id, 'UPDATE', performedBy, { amount, notes, is_paid });
    } catch (error) {
        console.error('Update Ledger Error:', error);
        res.status(500).json({ error: 'Failed to update ledger entry' });
    }
}

// Delete Ledger Entry (and associated components like UserFine if valid)
// Delete Ledger Entry (and associated components like UserFine if valid)
export const deleteLedgerEntry = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const entryId = parseInt(id);

        // 1. Find the entry first
        const entry = await prisma.feeLedger.findUnique({ where: { id: entryId } });
        if (!entry) {
            return res.status(404).json({ error: 'Entry not found' });
        }

        const parentId = entry.parent_ledger_id;

        // 2. If it is a FINE, try to find and delete the associated UserFine record
        if (entry.type === 'FINE') {
            const potentialFines = await prisma.userFine.findMany({
                where: {
                    user_id: entry.user_id,
                    amount_charged: entry.amount
                },
                orderBy: { createdAt: 'desc' }
            });

            // Find one that matches time
            const ledgerTime = new Date(entry.createdAt).getTime();
            const matchingFine = potentialFines.find(f => {
                const fineTime = new Date(f.createdAt).getTime();
                return Math.abs(fineTime - ledgerTime) < 10000; // 10 seconds diff
            });

            if (matchingFine) {
                await prisma.userFine.delete({ where: { id: matchingFine.id } });
                console.log(`Deleted associated UserFine #${matchingFine.id} for Ledger #${entryId}`);
            }
        }

        // 3. Delete the ledger entry
        await prisma.feeLedger.delete({ where: { id: entryId } });

        // 4. If it was a child payment, recalculate parent status
        if (parentId) {
            const parent = await prisma.feeLedger.findUnique({ where: { id: parentId } });
            if (parent) {
                const siblings = await prisma.feeLedger.findMany({ where: { parent_ledger_id: parentId } });
                const totalPaid = siblings.reduce((sum, s) => sum + s.amount, 0);

                const isNowPaid = totalPaid >= parent.amount;
                // Only update if status changed
                if (parent.is_paid !== isNowPaid) {
                    await prisma.feeLedger.update({
                        where: { id: parentId },
                        data: { is_paid: isNowPaid }
                    });
                }
            }
        }

        res.json({ message: 'Entry deleted' });

        const performedBy = (req as any).user?.userId || 1;
        await AuditService.logAction('LEDGER', entryId, 'DELETE', performedBy, { amount: entry.amount, type: entry.type });
    } catch (error) {
        console.error('Error deleting ledger entry:', error);
        res.status(500).json({ error: 'Failed to delete ledger entry' });
    }
}

export const checkSubscriptionPayment = async (req: Request, res: Response) => {
    try {
        const { user_id, month_year } = req.query;

        if (!user_id) return res.status(400).json({ error: 'User ID required' });

        let startDate, endDate;
        if (month_year) {
            const date = new Date(Date.parse(`01 ${month_year}`));
            if (!isNaN(date.getTime())) {
                startDate = new Date(date.getFullYear(), date.getMonth(), 1);
                endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);
            }
        }

        const where: any = {
            user_id: parseInt(user_id as string),
            type: 'SUBSCRIPTION',
            transaction_type: 'CREDIT'
        };

        if (startDate && endDate) {
            where.date = {
                gte: startDate,
                lte: endDate
            };
        }

        const payments = await prisma.feeLedger.findMany({
            where,
            orderBy: { date: 'desc' }
        });

        res.json(payments);

    } catch (error) {
        console.error('Error checking payments:', error);
        res.status(500).json({ error: 'Failed to check payments' });
    }
};
