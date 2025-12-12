import express from 'express';
import { getPlans, createPlan, getFines, createFine, getGroups, createGroup, updatePlan, deletePlan, updateFine, deleteFine } from '../controllers/master.controller.js';

const router = express.Router();

router.get('/plans', getPlans);
router.post('/plans', createPlan);
router.put('/plans/:id', updatePlan);
router.delete('/plans/:id', deletePlan);

router.get('/fines', getFines);
router.post('/fines', createFine);
router.put('/fines/:id', updateFine);
router.delete('/fines/:id', deleteFine);

router.get('/groups', getGroups);
router.post('/groups', createGroup);

export default router;
