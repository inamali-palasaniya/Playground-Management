import express from 'express';
import { getEntityLogs, getDeletedLogs } from '../controllers/log.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { checkPermission } from '../middleware/permission.middleware.js';

const router = express.Router();
router.use(authenticateToken);

router.get('/entity/:entityType/:entityId', checkPermission('audit', 'view'), getEntityLogs);
router.get('/deleted', checkPermission('audit', 'view'), getDeletedLogs);

export default router;
