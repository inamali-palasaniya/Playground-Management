import { Router } from 'express';
import {
  getFineRules,
  getFineRuleById,
  createFineRule,
  updateFineRule,
  deleteFineRule,
  applyFine,
  getUserFines,
  getFineSummary,
} from '../controllers/fine.controller.js';

const router = Router();

// Fine Rules
router.get('/rules', getFineRules);
router.get('/rules/:id', getFineRuleById);
router.post('/rules', createFineRule);
router.put('/rules/:id', updateFineRule);
router.delete('/rules/:id', deleteFineRule);

// User Fines
router.post('/apply', applyFine);
router.get('/user/:userId', getUserFines);
router.get('/summary/:userId', getFineSummary);

export default router;
