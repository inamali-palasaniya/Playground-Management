import express from 'express';
import {
    getPlans, createPlan, updatePlan, deletePlan,
    getFines, createFine, updateFine, deleteFine,
    getGroups, createGroup,
    getExpenseCategories, createExpenseCategory, updateExpenseCategory, deleteExpenseCategory
} from '../controllers/master.controller.js';

import { authenticateToken } from '../middleware/auth.middleware.js';
import { checkPermission } from '../middleware/permission.middleware.js';

const router = express.Router();

// Apply global middleware to all master routes
router.use(authenticateToken);

router.get('/plans', checkPermission('master_plans', 'view'), getPlans);
router.post('/plans', checkPermission('master_plans', 'add'), createPlan);
router.put('/plans/:id', checkPermission('master_plans', 'edit'), updatePlan);
router.delete('/plans/:id', checkPermission('master_plans', 'delete'), deletePlan);

router.get('/fines', checkPermission('master_fines', 'view'), getFines);
router.post('/fines', checkPermission('master_fines', 'add'), createFine);
router.put('/fines/:id', checkPermission('master_fines', 'edit'), updateFine);
router.delete('/fines/:id', checkPermission('master_fines', 'delete'), deleteFine);

router.get('/groups', checkPermission('master_groups', 'view'), getGroups);
router.post('/groups', checkPermission('master_groups', 'add'), createGroup);

router.get('/expense-categories', checkPermission('expense', 'view'), getExpenseCategories);
router.post('/expense-categories', checkPermission('expense', 'add'), createExpenseCategory);
router.put('/expense-categories/:id', checkPermission('expense', 'edit'), updateExpenseCategory);
router.delete('/expense-categories/:id', checkPermission('expense', 'delete'), deleteExpenseCategory);

export default router;
