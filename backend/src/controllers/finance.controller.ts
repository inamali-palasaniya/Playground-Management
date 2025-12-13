import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';

// Add Payment (Credit) with Auto-Match Logic
export const addPayment = async (req: Request, res: Response) => {
    try {
        const { user_id, amount, payment_method, notes, type, transaction_date, billing_period, link_to_id } = req.body; // link_to_id for explicit match

        if (!user_id || !amount) {
            return res.status(400).json({ error: 'User ID and amount are required' });
        }

        const numericAmount = parseFloat(amount);
        const paymentDate = transaction_date ? new Date(transaction_date) : new Date();

        let finalNotes = notes || '';
        if (type === 'SUBSCRIPTION' && billing_period) {
            finalNotes += ` (For period: ${billing_period})`;
        }

        // Implicit Logic: Create Payment
        const payment = await prisma.feeLedger.create({
            data: {
                user_id: parseInt(user_id),
                type: type || 'PAYMENT',
                transaction_type: 'CREDIT',
                payment_method: payment_method || 'CASH',
                amount: numericAmount,
                date: paymentDate,
                is_paid: true,
                notes: finalNotes ? finalNotes.trim() : undefined,
                parent_ledger_id: link_to_id ? parseInt(link_to_id) : undefined
            }
        });

        if (link_to_id) {
            // Explicit Match
            const parent = await prisma.feeLedger.findUnique({ where: { id: parseInt(link_to_id) } });
            if (parent) {
                // Check if Parent is fully paid including this new child
                const allChildren = await prisma.feeLedger.findMany({ where: { parent_ledger_id: parent.id } });
                const totalPaid = allChildren.reduce((sum, child) => sum + child.amount, 0);
                
                if (totalPaid >= parent.amount) {
                    await prisma.feeLedger.update({
                        where: { id: parent.id },
                        data: { is_paid: true }
                    });
                }
            }
        } else {
            // Auto-Match Logic: Find oldest unpaid DEBITS and mark them as paid
            // Only IF explicitly not linked? Or unrelated?
            // User requested: "separate" if not linked?
            // The request says "if its unpaid then within same row button appear for paid".
            // If I pay it, it shows as hierarchy.
            // If I just "add payment" without link, it might be general credit.
            // I'll keep the auto-match logic ONLY if not linked, OR effectively disable it if user wants strict control?
            // "but its shows both seprate" -> User dislikes auto match if it doesn't visually link them.
            // If I keep auto-match, I should likely SET the parent_id?
            // But auto-match usually clears multiple small debts with one big payment. One child -> Multiple parents?
            // Schema is One Parent -> Many Children (One Debit -> Many Payments).
            // So One Payment paying multiple Debts is NOT supported by standard parent_child relation unless M-N.
            // My schema: `parent_ledger_id` on Payment matches to One Debit.
            // So a single Payment can only belong to one Debit (Parent).
            // The existing Auto-Match logic splits the credit across multiple debts.
            // To support hierarchy for "Split" payments, I would need to split the Payment entry itself? Or M-N.
            // For now, I will DISABLE auto-match if `link_to_id` is NOT provided, OR just leave it as "General Credit" (which decreases balance but doesn't hierarchically nest).
            // User query: "hierarchy like i add payment 200 ... and there is paid/unpaid type ... if i paid it its shows as heararchy"
            // So if they click "Pay", it links.
            // If they just Add Payment, maybe valid to be floating?
            // I'll KEEP Auto-Match for now to ensure old behavior (clearing oldest debt status) remains, BUT I won't linking ID if it crosses multiple. 
            // Actually, if it covers one full debt, I could link it?
            // Complexity risk. Safe bet:
            // If `link_to_id` provided -> Do strictly that.
            // If NOT provided -> Run existing Auto-Match (mark `is_paid` but don't set `parent_id` basically).
            // Wait, if I want hierarchy, I probably WANT to set `parent_id` if auto-match finds a single target.
            // But let's stick to explicit `link_to_id` for the hierarchy feature as requested.
            
            // Existing Auto-Match (only if NO link_to_id)
            let remainingCredit = numericAmount;
    
            const unpaidDebts = await prisma.feeLedger.findMany({
                where: {
                    user_id: parseInt(user_id),
                    transaction_type: 'DEBIT',
                    is_paid: false
                },
                orderBy: { date: 'asc' }
            });
    
            for (const debt of unpaidDebts) {
                if (remainingCredit <= 0) break;
    
                if (remainingCredit >= debt.amount) {
                    await prisma.feeLedger.update({
                        where: { id: debt.id },
                        data: { is_paid: true, notes: (debt.notes || '') + ` (Paid via PMT-${payment.id})` }
                    });
                     // If DEPOSIT... (logic kept)
                     if (debt.type === 'DEPOSIT') {
                        await prisma.user.update({
                            where: { id: parseInt(user_id) },
                            data: { deposit_amount: { increment: debt.amount } }
                        });
                    }
                    remainingCredit -= debt.amount;
                }
            }
        }

        res.status(201).json(payment);
    } catch (error) {
        console.error('Error adding payment:', error);
        res.status(500).json({ error: 'Failed to add payment' });
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
                notes: notes || `Fine: ${rule.name} (Occurrence: ${previousFines + 1})`
            }
        });

        res.status(201).json(ledger);
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
        const { amount, notes, is_paid } = req.body;

        const updated = await prisma.feeLedger.update({
            where: { id: parseInt(id) },
            data: {
                amount: amount ? parseFloat(amount) : undefined,
                notes,
                is_paid: is_paid !== undefined ? is_paid : undefined
            }
        });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update ledger entry' });
    }
}

export const deleteLedgerEntry = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.feeLedger.delete({ where: { id: parseInt(id) } });
        res.json({ message: 'Entry deleted' });
    } catch (error) {
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
