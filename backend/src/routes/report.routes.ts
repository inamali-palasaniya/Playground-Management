import { Router } from 'express';
import { getFinancialReport, getUserReport } from '../controllers/report.controller';

const router = Router();

router.get('/financial', getFinancialReport);
router.get('/users', getUserReport);

export default router;
