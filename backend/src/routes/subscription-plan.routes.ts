import { Router } from 'express';
import {
  getAllPlans,
  getPlanById,
  createPlan,
  updatePlan,
  deletePlan,
} from '../controllers/subscription-plan.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { checkPermission } from '../middleware/permission.middleware.js';

const router = Router();
router.use(authenticateToken);

router.get('/', checkPermission('master_plans', 'view'), getAllPlans);
router.get('/:id', checkPermission('master_plans', 'view'), getPlanById);
router.post('/', checkPermission('master_plans', 'add'), createPlan);
router.put('/:id', checkPermission('master_plans', 'edit'), updatePlan);
router.delete('/:id', checkPermission('master_plans', 'delete'), deletePlan);

export default router;
