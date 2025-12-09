import { Router } from 'express';
import { createExpense, getExpenses } from '../controllers/expense.controller.js';

const router = Router();

router.post('/', createExpense);
router.get('/', getExpenses);

export default router;
