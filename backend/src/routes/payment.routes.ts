import { Router } from 'express';
import {
  recordPayment,
  getOutstandingBalance,
  getPaymentHistory,
  getUserLedger,
} from '../controllers/payment.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { checkPermission } from '../middleware/permission.middleware.js';

const router = Router();
router.use(authenticateToken);

router.post('/record', checkPermission('payment', 'add'), recordPayment);
router.get('/balance/:userId', checkPermission('payment', 'view', { selfAccessIdParam: 'userId' }), getOutstandingBalance);
router.get('/history/:userId', checkPermission('payment', 'view', { selfAccessIdParam: 'userId' }), getPaymentHistory);
router.get('/ledger/:userId', checkPermission('payment', 'view', { selfAccessIdParam: 'userId' }), getUserLedger);

export default router;
