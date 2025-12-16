import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-it';

export interface AuthRequest extends Request {
  user?: {
    userId: number;
    email: string;
    role: string;
  };
}

import prisma from '../utils/prisma.js';

// Remove local instantiation
// const prisma = new PrismaClient();

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET) as any;

    // Check DB for Active Status (Force Logout)
    const user = await prisma.user.findUnique({
      where: { id: verified.userId },
      select: { is_active: true, role: true } // Fetch minimal data
    });

    if (!user || !user.is_active) {
      return res.status(403).json({ error: 'You are inactivated. Contact Administrator.', forceLogout: true });
    }

    req.user = verified;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token.' });
  }
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'MANAGEMENT') { // Matches UserRole.MANAGEMENT in Prisma
    return res.status(403).json({ error: 'Access denied. Management role required.' });
  }
  next();
};
