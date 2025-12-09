import { Router } from 'express';
import {
  recordPayment,
  getOutstandingBalance,
  getPaymentHistory,
  getUserLedger,
} from '../controllers/payment.controller.js';

const router = Router();

router.post('/record', recordPayment);
router.get('/balance/:userId', getOutstandingBalance);
router.get('/history/:userId', getPaymentHistory);
router.get('/ledger/:userId', getUserLedger);

export default router;
