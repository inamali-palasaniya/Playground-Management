import { Router } from 'express';
import { createExpense, getExpenses, updateExpense, deleteExpense, getExpenseStats } from '../controllers/expense.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { checkPermission } from '../middleware/permission.middleware.js';

const router = Router();

router.use(authenticateToken); // Ensure all are authenticated

router.post('/', checkPermission('expense', 'add'), createExpense);
router.get('/', checkPermission('expense', 'view'), getExpenses);
router.put('/:id', checkPermission('expense', 'edit'), updateExpense);
router.delete('/:id', checkPermission('expense', 'delete'), deleteExpense);
router.get('/stats', checkPermission('expense', 'view'), getExpenseStats);

export default router;
