import { PrismaClient } from '../generated/client/client.js';
import prisma from '../utils/prisma.js';

export class AuditService {
    static async logAction(
        entityType: string,
        entityId: number,
        action: 'CREATE' | 'UPDATE' | 'DELETE',
        performedBy: number,
        details?: any
    ) {
        try {
            await prisma.auditLog.create({
                data: {
                    entity_type: entityType,
                    entity_id: entityId,
                    action,
                    performed_by_id: performedBy,
                    details: details || {},
                },
            });
        } catch (error) {
            console.error('Failed to create audit log:', error);
            // Non-blocking: don't fail the main request if logging fails?
            // Depends on strictness. For now, just log error.
        }
    }

    static async getLogs(entityType: string, entityId: number) {
        return prisma.auditLog.findMany({
            where: { entity_type: entityType, entity_id: entityId },
            include: { performed_by: { select: { name: true, email: true } } },
            orderBy: { timestamp: 'desc' },
        });
    }

    static async getDeletedLogs(entityType?: string) {
        // Logs where action is DELETE
        return prisma.auditLog.findMany({
            where: {
                action: 'DELETE',
                ...(entityType ? { entity_type: entityType } : {})
            },
            include: { performed_by: { select: { name: true, email: true } } },
            orderBy: { timestamp: 'desc' },
        });
    }
}
