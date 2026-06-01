import { Response } from 'express';
import { reportService } from '../services/reportService';
import { AuthRequest } from '../middleware/auth';
import { sendSuccess, sendCreated, sendError } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { z } from 'zod';

const generateSchema = z.object({
  projectId: z.string().min(1),
  type: z.enum(['pdf', 'csv']),
});

export const reportController = {
  list: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { projectId } = req.params;
    const reports = await reportService.listByProject(projectId, req.user!.userId);
    return sendSuccess(res, reports);
  }),

  generate: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { projectId, type } = generateSchema.parse({
      projectId: req.body.projectId ?? req.params.projectId,
      type: req.body.type,
    });

    const report = await reportService.generate(projectId, type, req.user!.userId);
    return sendCreated(res, report, `Reporte ${type.toUpperCase()} generado correctamente`);
  }),

  download: asyncHandler(async (req: AuthRequest, res: Response) => {
    const url = await reportService.getDownloadUrl(req.params.reportId, req.user!.userId);
    return sendSuccess(res, { url, expiresIn: 900 });
  }),
};
