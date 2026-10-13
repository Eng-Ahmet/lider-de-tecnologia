import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/config.js';
import { UserRole } from '../types/user.js';

export interface AuthenticatedUserPayload {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUserPayload;
}

export function authenticateUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Acceso no autenticado. Inicie sesión para continuar.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as AuthenticatedUserPayload;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Sesión inválida o expirada. Por favor vuelva a iniciar sesión.' });
  }
}

export function optionalUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as AuthenticatedUserPayload;
      req.user = decoded;
    } catch {
      // Ignored for optional
    }
  }
  next();
}

export function requireRole(requiredRole: UserRole) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Debe iniciar sesión para realizar esta acción.' });
      return;
    }

    if (req.user.role !== requiredRole && req.user.role !== 'Administrator') {
      res.status(403).json({
        error: `Acceso restringido: Se requieren permisos de ${requiredRole}.`,
      });
      return;
    }

    next();
  };
}
