import { Router } from 'express';
import { createUser, getUsers, getUserById, updateUser, deleteUser, updatePushToken } from '../controllers/user.controller.js';
import { getUserMatches } from '../controllers/match.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { checkPermission } from '../middleware/permission.middleware.js';

const router = Router();

router.post('/', authenticateToken, checkPermission('user', 'add'), createUser);
router.get('/', authenticateToken, checkPermission('user', 'view'), getUsers);
router.get('/:id', authenticateToken, checkPermission('user', 'view', { selfAccessIdParam: 'id' }), getUserById);
router.put('/:id', authenticateToken, checkPermission('user', 'edit', { selfAccessIdParam: 'id' }), updateUser);
router.post('/:userId/push-token', authenticateToken, updatePushToken); // Self-update allowed for Push Token
router.delete('/:id', authenticateToken, checkPermission('user', 'delete'), deleteUser);
router.get('/:userId/matches', authenticateToken, checkPermission('user', 'view'), getUserMatches);

export default router;
