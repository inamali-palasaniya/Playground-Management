import express from 'express';
import { getEntityLogs, getDeletedLogs } from '../controllers/log.controller.js';

const router = express.Router();

router.get('/entity/:entityType/:entityId', getEntityLogs);
router.get('/deleted', getDeletedLogs);

export default router;
