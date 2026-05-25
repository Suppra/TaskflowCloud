import { Response } from 'express';
import { metricsService } from '../services/metricsService';
import { AuthRequest } from '../middleware/auth';
import { sendSuccess } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';

export const metricsController = {
  getDashboard: asyncHandler(async (req: AuthRequest, res: Response) => {
    const metrics = await metricsService.getDashboard(req.user!.userId);
    return sendSuccess(res, metrics);
  }),

  getProjectMetrics: asyncHandler(async (req: AuthRequest, res: Response) => {
    const metrics = await metricsService.getProjectMetrics(req.params.projectId);
    return sendSuccess(res, metrics);
  }),
};
