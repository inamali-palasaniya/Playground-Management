import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma.js';

export const checkPermission = (moduleName: string, action: 'add' | 'edit' | 'delete') => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            // @ts-ignore
            const userId = req.user?.userId;

            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const user = await prisma.user.findUnique({
                where: { id: userId },
                include: { permissions: true }
            });

            if (!user) {
                return res.status(401).json({ error: 'User not found' });
            }

            // 1. Force Logout Logic (Inactive check)
            if (!user.is_active) {
                return res.status(403).json({ error: 'You are inactivated. Contact Administrator.', forceLogout: true });
            }

            // 2. Super Admin Bypass
            if (user.email === '91inamali@gmail.com' || user.role === 'SUPER_ADMIN') {
                return next();
            }

            // 3. Management Type Check
            if (user.role !== 'MANAGEMENT') {
                return res.status(403).json({ error: 'Access denied. Management role required.' });
            }

            // 4. Specific Permission Check
            const permission = user.permissions.find(p => p.module_name === moduleName);

            if (!permission) {
                return res.status(403).json({ error: 'No permission. Contact Administrator.' });
            }

            let hasAccess = false;
            if (action === 'add') hasAccess = permission.can_add;
            if (action === 'edit') hasAccess = permission.can_edit;
            if (action === 'delete') hasAccess = permission.can_delete;

            if (!hasAccess) {
                return res.status(403).json({ error: 'No permission. Contact Administrator.' });
            }

            next();
        } catch (error) {
            console.error('Permission Middleware Error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    };
};
