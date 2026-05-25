import { Response } from 'express';
import { metricsService } from '../services/metricsService';
import { AuthRequest } from '../middleware/auth';
import { sendSuccess } from '../utils/response';

export const metricsController = {
  async getDashboard(req: AuthRequest, res: Response) {
    const metrics = await metricsService.getDashboard(req.user!.userId);
    return sendSuccess(res, metrics);
  },

  async getProjectMetrics(req: AuthRequest, res: Response) {
    const metrics = await metricsService.getProjectMetrics(req.params.projectId);
    return sendSuccess(res, metrics);
  },
};
