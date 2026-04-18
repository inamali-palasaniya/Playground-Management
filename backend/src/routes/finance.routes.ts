import express from 'express';
import { addPayment, addFine, getUserFinancials, getAllLedgers, chargeMonthlyFee, updateLedgerEntry, deleteLedgerEntry, checkSubscriptionPayment } from '../controllers/finance.controller.js';

import { authenticateToken } from '../middleware/auth.middleware.js';
import { checkPermission } from '../middleware/permission.middleware.js';

const router = express.Router();
router.use(authenticateToken);

router.post('/payment', checkPermission('payment', 'add'), addPayment);
router.post('/fine', checkPermission('finance', 'add'), addFine);
router.post('/monthly-charge', checkPermission('finance', 'edit'), chargeMonthlyFee);
router.put('/ledger/:id', checkPermission('finance', 'edit'), updateLedgerEntry);
router.delete('/ledger/:id', checkPermission('finance', 'delete'), deleteLedgerEntry);
router.get('/ledger', checkPermission('finance', 'view'), getAllLedgers);
router.get('/user/:userId', checkPermission('finance', 'view', { selfAccessIdParam: 'userId' }), getUserFinancials);
router.get('/check-subscription', checkPermission('finance', 'view'), checkSubscriptionPayment);

export default router;
