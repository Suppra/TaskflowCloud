import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../config/logger';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  logger.error({ message: err.message, stack: err.stack, path: req.path });

  if (err instanceof ZodError) {
    return res.status(422).json({
      success: false,
      error: 'Datos de entrada inválidos',
      details: err.flatten().fieldErrors,
    });
  }

  const statusCode = (err as { statusCode?: number }).statusCode ?? 500;
  return res.status(statusCode).json({
    success: false,
    error: statusCode === 500 ? 'Error interno del servidor' : err.message,
  });
};

export const notFound = (req: Request, res: Response) => {
  res.status(404).json({ success: false, error: `Ruta no encontrada: ${req.path}` });
};
