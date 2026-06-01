import { Response } from 'express';
import { notificationRepository } from '../repositories/notificationRepository';
import { AuthRequest } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';

export const notificationController = {
  list: asyncHandler(async (req: AuthRequest, res: Response) => {
    const notifications = await notificationRepository.findByUser(req.user!.userId);
    return sendSuccess(res, notifications);
  }),

  countUnread: asyncHandler(async (req: AuthRequest, res: Response) => {
    const count = await notificationRepository.countUnread(req.user!.userId);
    return sendSuccess(res, { count });
  }),

  markAsRead: asyncHandler(async (req: AuthRequest, res: Response) => {
    const notification = await notificationRepository.findById(req.params.notificationId);
    if (!notification) return sendError(res, 'Notificación no encontrada', 404);
    if (notification.userId !== req.user!.userId) return sendError(res, 'Acceso denegado', 403);

    const updated = await notificationRepository.markAsRead(req.params.notificationId);
    return sendSuccess(res, updated, 'Notificación marcada como leída');
  }),

  markAllAsRead: asyncHandler(async (req: AuthRequest, res: Response) => {
    await notificationRepository.markAllAsRead(req.user!.userId);
    return sendSuccess(res, null, 'Todas las notificaciones marcadas como leídas');
  }),
};
