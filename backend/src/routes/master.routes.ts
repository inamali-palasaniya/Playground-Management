import express from 'express';
import { getPlans, createPlan, getFines, createFine, getGroups, createGroup, updatePlan, deletePlan, updateFine, deleteFine } from '../controllers/master.controller.js';

import { authenticateToken, requireAdmin } from '../middleware/auth.middleware.js';

const router = express.Router();

// Apply global middleware to all master routes
router.use(authenticateToken);

router.get('/plans', getPlans);
router.post('/plans', requireAdmin, createPlan);
router.put('/plans/:id', requireAdmin, updatePlan);
router.delete('/plans/:id', requireAdmin, deletePlan);

router.get('/fines', getFines);
router.post('/fines', requireAdmin, createFine);
router.put('/fines/:id', requireAdmin, updateFine);
router.delete('/fines/:id', requireAdmin, deleteFine);

router.get('/groups', getGroups);
router.post('/groups', requireAdmin, createGroup);

export default router;
