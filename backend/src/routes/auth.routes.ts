import express from 'express';
import { login, register, getMe, forgotPassword, resetPassword, resetPasswordWithToken } from '../controllers/auth.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/login', login);
router.post('/register', register);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/reset-password-token', resetPasswordWithToken);
router.get('/me', authenticateToken, getMe);

export default router;
