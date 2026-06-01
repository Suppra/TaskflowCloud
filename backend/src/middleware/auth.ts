import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { JwtPayload } from '../types';
import { sendError } from '../utils/response';

/**
 * En @types/express-serve-static-core v5, ParamsDictionary tiene
 * [key: string]: string | string[].  Al tipar los params como
 * Record<string, string> los controladores reciben `string` directamente,
 * que es siempre el caso real en rutas con :param.
 */
export interface AuthRequest extends Request<Record<string, string>> {
  user?: JwtPayload;
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return sendError(res, 'Token de autenticación requerido', 401);
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = payload;
    return next();
  } catch {
    return sendError(res, 'Token inválido o expirado', 401);
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return sendError(res, 'No autenticado', 401);
    if (!roles.includes(req.user.role)) {
      return sendError(res, 'Permisos insuficientes', 403);
    }
    return next();
  };
};
