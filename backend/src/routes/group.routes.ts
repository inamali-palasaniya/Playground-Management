import { Router } from 'express';
import { createGroup, getGroups, updateGroup, deleteGroup } from '../controllers/group.controller.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticateToken); // All group routes protected

router.post('/', requireAdmin, createGroup);
router.get('/', getGroups);
router.put('/:id', requireAdmin, updateGroup);
router.delete('/:id', requireAdmin, deleteGroup);

export default router;
