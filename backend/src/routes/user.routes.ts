import { Router } from 'express';
import { createUser, getUsers, getUserById, updateUser, deleteUser, updatePushToken } from '../controllers/user.controller.js';
import { getUserMatches } from '../controllers/match.controller.js';

const router = Router();

router.post('/', createUser);
router.get('/', getUsers);
router.get('/:id', getUserById);
router.put('/:id', updateUser);
router.post('/:userId/push-token', updatePushToken);
router.delete('/:id', deleteUser);
router.get('/:userId/matches', getUserMatches);

export default router;
