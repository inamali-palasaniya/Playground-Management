import { Router } from 'express';
import {
  getFinancialSummary,
  getAttendanceStats,
  getIncomeExpenseReport,
} from '../controllers/analytics.controller';

const router = Router();

router.get('/financial-summary', getFinancialSummary);
router.get('/attendance-stats', getAttendanceStats);
router.get('/income-expense', getIncomeExpenseReport);

export default router;
