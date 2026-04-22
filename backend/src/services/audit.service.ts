import { PrismaClient } from '@prisma/client';
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
        }
    }

    static async logUpdate(
        entityType: string,
        entityId: number,
        performedBy: number,
        oldData: any,
        newData: any
    ) {
        const changes: any = {};
        for (const key in newData) {
            if (newData[key] !== undefined && newData[key] !== oldData[key]) {
                // Skip sensitive or non-comparable fields
                if (key === 'password' || key === 'createdAt' || key === 'updatedAt') continue;
                
                // Deep comparison for dates if needed, but for now simple check
                if (oldData[key] instanceof Date && newData[key] instanceof Date) {
                    if (oldData[key].getTime() === newData[key].getTime()) continue;
                }

                changes[key] = {
                    from: oldData[key],
                    to: newData[key]
                };
            }
        }

        if (Object.keys(changes).length > 0) {
            await this.logAction(entityType, entityId, 'UPDATE', performedBy, { changes });
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
