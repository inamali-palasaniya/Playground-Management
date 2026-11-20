import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma.js';

export const checkPermission = (moduleName: string, action: 'view' | 'add' | 'edit' | 'delete', options?: { selfAccessIdParam?: string }) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            // @ts-ignore
            const userId = req.user?.userId;

            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            // Check for Self-Access if enabled (e.g. user viewing their own attendance)
            if (options?.selfAccessIdParam) {
                const resourceId = req.params[options.selfAccessIdParam] || req.query[options.selfAccessIdParam];
                if (resourceId && parseInt(resourceId as string) === userId) {
                    return next();
                }
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
            if (user.email?.toLowerCase() === '91inamali@gmail.com' || user.role === 'SUPER_ADMIN') {
                return next();
            }

            // 3. Management Type Check
            if (user.role !== 'MANAGEMENT') {
                return res.status(403).json({ error: 'Access denied. Management role required.' });
            }

            // 4. Specific Permission Check (with Comprehensive Alias Support)
            const aliases: { [key: string]: string[] } = {
                'cricket_scoring': ['scoring', 'cricket', 'tournament', 'tournaments', 'team', 'teams', 'match', 'matches'],
                'tournament': ['cricket_scoring', 'scoring', 'tournament', 'tournaments'],
                'team': ['cricket_scoring', 'scoring', 'team', 'teams'],
                'match': ['cricket_scoring', 'scoring', 'match', 'matches'],
                'finance': ['charge', 'charges', 'payment', 'payments', 'ledger', 'ledgers', 'fine', 'fines'],
                'charge': ['finance', 'payment', 'payments', 'master_fines', 'fine', 'fines'],
                'payment': ['finance', 'charge', 'payments', 'ledger'],
                'user': ['users'],
                'users': ['user'],
                'audit': ['report', 'reports', 'log', 'logs'],
                'report': ['audit', 'reports', 'logs'],
                'logs': ['audit', 'log', 'reports'],
                'master_plans': ['subscription', 'subscriptions', 'plan', 'plans', 'master'],
                'subscription': ['master_plans', 'subscriptions', 'plans'],
                'master_fines': ['fine', 'fines', 'charge', 'finance'],
                'fine': ['master_fines', 'finance', 'charge'],
                'master_groups': ['group', 'groups'],
                'group': ['master_groups', 'groups']
            };

            const searchModules = [moduleName, ...(aliases[moduleName] || [])];
            const permission = user.permissions.find(p => searchModules.includes(p.module_name));

            console.log(`[PermissionCheck] User: ${userId}, Module: ${moduleName}, Action: ${action}, PermissionRecord: ${permission ? 'Found' : 'Missing'}`);
            if (permission) {
                console.log(`[PermissionData] ${JSON.stringify(permission)}`);
            }

            const friendlyModule = moduleName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            const errorData = {
                error: `Missing Permission`,
                message: `You do not have '${action}' access for the '${friendlyModule}' module.`,
                details: `Required: ${moduleName}.${action}`,
                module: moduleName,
                action: action,
                code: 'PERMISSION_DENIED'
            };

            if (!permission) {
                return res.status(403).json(errorData);
            }

            let hasAccess = false;
            if (action === 'view') {
                hasAccess = permission.can_view;
            } else if (action === 'add') {
                hasAccess = permission.can_add;
            } else if (action === 'edit') {
                hasAccess = permission.can_edit;
            } else if (action === 'delete') {
                hasAccess = permission.can_delete;
            }

            if (!hasAccess) {
                return res.status(403).json(errorData);
            }

            next();
        } catch (error) {
            console.error('Permission Middleware Error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    };
};
