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
import { authenticateToken } from '../middleware/auth.middleware.js';
import { checkPermission } from '../middleware/permission.middleware.js';

const router = Router();
router.use(authenticateToken);

// Fine Rules
router.get('/rules', checkPermission('master_fines', 'view'), getFineRules);
router.get('/rules/:id', checkPermission('master_fines', 'view'), getFineRuleById);
router.post('/rules', checkPermission('master_fines', 'add'), createFineRule);
router.put('/rules/:id', checkPermission('master_fines', 'edit'), updateFineRule);
router.delete('/rules/:id', checkPermission('master_fines', 'delete'), deleteFineRule);

// User Fines
router.post('/apply', checkPermission('finance', 'add'), applyFine);
router.get('/user/:userId', checkPermission('finance', 'view'), getUserFines);
router.get('/summary/:userId', checkPermission('finance', 'view'), getFineSummary);

export default router;
