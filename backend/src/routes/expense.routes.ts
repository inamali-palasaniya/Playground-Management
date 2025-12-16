import { Router } from 'express';
import { createExpense, getExpenses, updateExpense, deleteExpense, getExpenseStats } from '../controllers/expense.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { checkPermission } from '../middleware/permission.middleware.js';

const router = Router();

router.use(authenticateToken); // Ensure all are authenticated

router.post('/', checkPermission('expense', 'add'), createExpense);
router.get('/', getExpenses); // View permission? Maybe add 'view' later, but usually list is open or restricted by role. User list is open.
router.put('/:id', checkPermission('expense', 'edit'), updateExpense);
router.delete('/:id', checkPermission('expense', 'delete'), deleteExpense);
router.get('/stats', getExpenseStats); // For dashboard or specific expense view

export default router;
