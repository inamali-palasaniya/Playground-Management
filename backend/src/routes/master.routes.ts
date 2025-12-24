import express from 'express';
import {
    getPlans, createPlan, updatePlan, deletePlan,
    getFines, createFine, updateFine, deleteFine,
    getGroups, createGroup,
    getExpenseCategories, createExpenseCategory, updateExpenseCategory, deleteExpenseCategory
} from '../controllers/master.controller.js';

import { authenticateToken, requireAdmin } from '../middleware/auth.middleware.js';

const router = express.Router();

// Apply global middleware to all master routes
router.use(authenticateToken);

router.get('/plans', getPlans);
router.post('/plans', requireAdmin, createPlan);
router.put('/plans/:id', requireAdmin, updatePlan);
router.delete('/plans/:id', requireAdmin, deletePlan);

router.get('/fines', getFines);
router.post('/fines', requireAdmin, createFine);
router.put('/fines/:id', requireAdmin, updateFine);
router.delete('/fines/:id', requireAdmin, deleteFine);

router.get('/groups', getGroups);
router.post('/groups', requireAdmin, createGroup);

router.get('/expense-categories', getExpenseCategories);
router.post('/expense-categories', requireAdmin, createExpenseCategory);
router.put('/expense-categories/:id', requireAdmin, updateExpenseCategory);
router.delete('/expense-categories/:id', requireAdmin, deleteExpenseCategory);

export default router;
