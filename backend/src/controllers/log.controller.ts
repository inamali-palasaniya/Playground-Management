import { Request, Response } from 'express';
import { AuditService } from '../services/audit.service.js';

export const getEntityLogs = async (req: Request, res: Response) => {
    try {
        const { entityType, entityId } = req.params;
        const logs = await AuditService.getLogs(entityType, parseInt(entityId));
        res.json(logs);
    } catch (error) {
        console.error('Error fetching logs:', error);
        res.status(500).json({ error: 'Failed to fetch logs' });
    }
};

export const getDeletedLogs = async (req: Request, res: Response) => {
    try {
        const { entityType } = req.query;
        const logs = await AuditService.getDeletedLogs(entityType as string);
        res.json(logs);
    } catch (error) {
        console.error('Error fetching deleted logs:', error);
        res.status(500).json({ error: 'Failed to fetch deleted logs' });
    }
};
