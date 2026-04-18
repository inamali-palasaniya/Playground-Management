import { Router } from 'express';
import {
  getFinancialSummary,
  getAttendanceStats,
  getIncomeExpenseReport,
} from '../controllers/analytics.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { checkPermission } from '../middleware/permission.middleware.js';

const router = Router();
router.use(authenticateToken);

router.get('/financial-summary', checkPermission('finance', 'view', { selfAccessIdParam: 'userId' }), getFinancialSummary);
router.get('/attendance-stats', checkPermission('attendance', 'view', { selfAccessIdParam: 'userId' }), getAttendanceStats);
router.get('/income-expense', checkPermission('finance', 'view'), getIncomeExpenseReport);

export default router;
