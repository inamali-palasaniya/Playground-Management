import { Request, Response } from 'express';
import prisma from '../utils/prisma';

// Fine Rules CRUD
export const getFineRules = async (req: Request, res: Response) => {
  try {
    const rules = await prisma.fineRule.findMany({
      orderBy: { id: 'desc' },
    });
    res.json(rules);
  } catch (error) {
    console.error('Error fetching fine rules:', error);
    res.status(500).json({ error: 'Failed to fetch fine rules', details: error instanceof Error ? error.message : String(error) });
  }
};

export const getFineRuleById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const rule = await prisma.fineRule.findUnique({
      where: { id: parseInt(id) },
      include: {
        fines: {
          include: {
            user: {
              select: { id: true, name: true, phone: true },
            },
          },
        },
      },
    });

    if (!rule) {
      return res.status(404).json({ error: 'Fine rule not found' });
    }

    res.json(rule);
  } catch (error) {
    console.error('Error fetching fine rule:', error);
    res.status(500).json({ error: 'Failed to fetch fine rule' });
  }
};

export const createFineRule = async (req: Request, res: Response) => {
  try {
    const { name, first_time_fine, subsequent_multiplier } = req.body;

    if (!name || !first_time_fine) {
      return res.status(400).json({ error: 'Name and first time fine are required' });
    }

    const rule = await prisma.fineRule.create({
      data: {
        name,
        first_time_fine: parseFloat(first_time_fine),
        subsequent_multiplier: subsequent_multiplier ? parseFloat(subsequent_multiplier) : 1,
      },
    });

    res.status(201).json(rule);
  } catch (error) {
    console.error('Error creating fine rule:', error);
    res.status(500).json({ error: 'Failed to create fine rule' });
  }
};

export const updateFineRule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, first_time_fine, subsequent_multiplier } = req.body;

    const rule = await prisma.fineRule.update({
      where: { id: parseInt(id) },
      data: {
        name,
        first_time_fine: first_time_fine ? parseFloat(first_time_fine) : undefined,
        subsequent_multiplier: subsequent_multiplier ? parseFloat(subsequent_multiplier) : undefined,
      },
    });

    res.json(rule);
  } catch (error) {
    console.error('Error updating fine rule:', error);
    res.status(500).json({ error: 'Failed to update fine rule' });
  }
};

export const deleteFineRule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.fineRule.delete({
      where: { id: parseInt(id) },
    });

    res.json({ message: 'Fine rule deleted successfully' });
  } catch (error) {
    console.error('Error deleting fine rule:', error);
    res.status(500).json({ error: 'Failed to delete fine rule' });
  }
};

// Apply Fine with Escalation Logic
export const applyFine = async (req: Request, res: Response) => {
  try {
    const { user_id, rule_id } = req.body;

    if (!user_id || !rule_id) {
      return res.status(400).json({ error: 'User ID and Rule ID are required' });
    }

    // Get the fine rule
    const rule = await prisma.fineRule.findUnique({
      where: { id: parseInt(rule_id) },
    });

    if (!rule) {
      return res.status(404).json({ error: 'Fine rule not found' });
    }

    // Count previous occurrences of this rule for this user
    const previousOccurrences = await prisma.userFine.count({
      where: {
        user_id: parseInt(user_id),
        rule_id: parseInt(rule_id),
      },
    });

    const occurrence = previousOccurrences + 1;

    // Calculate fine amount with escalation
    let amount: number;
    if (occurrence === 1) {
      amount = rule.first_time_fine;
    } else {
      // Exponential escalation: first_time_fine × (multiplier ^ (occurrence - 1))
      amount = rule.first_time_fine * Math.pow(rule.subsequent_multiplier, occurrence - 1);
    }

    // Create UserFine record
    const userFine = await prisma.userFine.create({
      data: {
        user_id: parseInt(user_id),
        rule_id: parseInt(rule_id),
        occurrence,
        amount_charged: amount,
      },
      include: {
        user: {
          select: { id: true, name: true, phone: true },
        },
        rule: true,
      },
    });

    // Create FeeLedger entry
    await prisma.feeLedger.create({
      data: {
        user_id: parseInt(user_id),
        type: 'FINE',
        amount,
        is_paid: false,
      },
    });

    res.status(201).json(userFine);
  } catch (error) {
    console.error('Error applying fine:', error);
    res.status(500).json({ error: 'Failed to apply fine', details: error instanceof Error ? error.message : String(error) });
  }
};

// Get User Fines
export const getUserFines = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const fines = await prisma.userFine.findMany({
      where: { user_id: parseInt(userId) },
      include: {
        rule: true,
      },
      orderBy: { date: 'desc' },
    });

    res.json(fines);
  } catch (error) {
    console.error('Error fetching user fines:', error);
    res.status(500).json({ error: 'Failed to fetch user fines', details: error instanceof Error ? error.message : String(error) });
  }
};

// Get Fine Summary
export const getFineSummary = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const totalFines = await prisma.userFine.count({
      where: { user_id: parseInt(userId) },
    });

    const totalAmount = await prisma.userFine.aggregate({
      where: { user_id: parseInt(userId) },
      _sum: {
        amount_charged: true,
      },
    });

    // Group by rule
    const finesByRule = await prisma.userFine.groupBy({
      by: ['rule_id'],
      where: { user_id: parseInt(userId) },
      _count: true,
      _sum: {
        amount_charged: true,
      },
    });

    res.json({
      total_fines: totalFines,
      total_amount: totalAmount._sum.amount_charged || 0,
      fines_by_rule: finesByRule,
    });
  } catch (error) {
    console.error('Error fetching fine summary:', error);
    res.status(500).json({ error: 'Failed to fetch fine summary' });
  }
};
