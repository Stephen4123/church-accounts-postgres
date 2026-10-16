import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '../types';

export const JWT_SECRET = process.env.JWT_SECRET || 'church_horeb_accounts_jwt_secret_key_2026';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  photo_url?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
  [key: string]: any;
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid or expired session token' });
    }
    req.user = decoded as AuthUser;
    next();
  });
}

export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    req.user = undefined;
    return next();
  }
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    req.user = err ? undefined : (decoded as AuthUser);
    next();
  });
}

export function requireRole(allowedRoles: UserRole[] = []) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const userRole = req.user.role || 'Committee Member';
    if (userRole === 'Admin' || allowedRoles.includes(userRole)) {
      return next();
    }
    return res.status(403).json({
      success: false,
      message: `Access denied. Your role (${userRole}) is not permitted to perform this action.`
    });
  };
}
