import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';



export interface AuthRequest extends Request {
  user?: {
    userId: number;
    email: string;
    role: string;
  };
}

import prisma from '../utils/prisma.js';

// const prisma = new PrismaClient();

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      console.error('CRITICAL: JWT_SECRET missing during token verification.');
      return res.status(500).json({ error: 'Server configuration error (JWT_SECRET)' });
    }
    const verified = jwt.verify(token, JWT_SECRET) as any;

    // Check DB for Active Status (Force Logout)
    const user = await prisma.user.findUnique({
      where: { id: verified.userId },
      select: { is_active: true, role: true } // Fetch minimal data
    });

    if (!user || !user.is_active) {
      return res.status(403).json({ error: 'You are inactivated. Contact Administrator.', forceLogout: true });
    }

    // CRITICAL FIX: Override the role from the token with the fresh role from the DB.
    // This allows role changes (e.g. Normal -> Super Admin) to take effect immediately without re-login.
    req.user = {
      ...verified,
      role: user.role // Use fresh role
    };
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token.' });
  }
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  const role = req.user?.role;
  if (role !== 'MANAGEMENT' && role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Access denied. Management or Super Admin role required.' });
  }
  next();
};
