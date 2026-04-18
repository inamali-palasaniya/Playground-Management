import { Router } from 'express';
import { createGroup, getGroups, updateGroup, deleteGroup } from '../controllers/group.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { checkPermission } from '../middleware/permission.middleware.js';

const router = Router();

router.use(authenticateToken); // All group routes protected

router.post('/', checkPermission('master_groups', 'add'), createGroup);
router.get('/', checkPermission('master_groups', 'view'), getGroups);
router.put('/:id', checkPermission('master_groups', 'edit'), updateGroup);
router.delete('/:id', checkPermission('master_groups', 'delete'), deleteGroup);

export default router;
