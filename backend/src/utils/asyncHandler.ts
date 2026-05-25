import { Request, Response, NextFunction } from 'express';

/**
 * Envuelve handlers async para que los errores rechazados lleguen al
 * middleware global de errores de Express 4 (que no captura async por defecto).
 */
export const asyncHandler = <TReq extends Request = Request>(
  fn: (req: TReq, res: Response, next: NextFunction) => Promise<unknown>
) =>
  (req: TReq, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
