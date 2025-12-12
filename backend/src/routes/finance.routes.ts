import express from 'express';
import { addPayment, addFine, getUserFinancials, chargeMonthlyFee, updateLedgerEntry, deleteLedgerEntry } from '../controllers/finance.controller.js';

const router = express.Router();

router.post('/payment', addPayment);
router.post('/fine', addFine);
router.post('/monthly-charge', chargeMonthlyFee);
router.put('/ledger/:id', updateLedgerEntry);
router.delete('/ledger/:id', deleteLedgerEntry);
router.get('/user/:userId', getUserFinancials);

export default router;
