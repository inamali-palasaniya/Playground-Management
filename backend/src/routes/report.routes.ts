import { Router } from 'express';
import { getFinancialReport, getUserReport } from '../controllers/report.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { checkPermission } from '../middleware/permission.middleware.js';

const router = Router();
router.use(authenticateToken);

router.get('/financial', checkPermission('audit', 'view'), getFinancialReport);
router.get('/users', checkPermission('audit', 'view'), getUserReport);

export default router;
