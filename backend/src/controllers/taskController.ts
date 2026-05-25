import { Response } from 'express';
import { taskService } from '../services/taskService';
import { AuthRequest } from '../middleware/auth';
import { createTaskSchema, updateTaskSchema, addCommentSchema, addSubtaskSchema } from '../validators/task';
import { sendSuccess, sendCreated } from '../utils/response';

export const taskController = {
  async create(req: AuthRequest, res: Response) {
    const input = createTaskSchema.parse(req.body);
    const task = await taskService.create(
      req.params.boardId,
      req.params.projectId,
      input,
      req.user!.userId
    );
    return sendCreated(res, task, 'Tarea creada');
  },

  async listByBoard(req: AuthRequest, res: Response) {
    const tasks = await taskService.findByBoard(req.params.boardId);
    return sendSuccess(res, tasks);
  },

  async getById(req: AuthRequest, res: Response) {
    const task = await taskService.findById(req.params.taskId);
    return sendSuccess(res, task);
  },

  async update(req: AuthRequest, res: Response) {
    const input = updateTaskSchema.parse(req.body);
    const task = await taskService.update(req.params.taskId, input, req.user!.userId);
    return sendSuccess(res, task, 'Tarea actualizada');
  },

  async delete(req: AuthRequest, res: Response) {
    await taskService.delete(req.params.taskId);
    return sendSuccess(res, null, 'Tarea eliminada');
  },

  async addSubtask(req: AuthRequest, res: Response) {
    const { title } = addSubtaskSchema.parse(req.body);
    const task = await taskService.addSubtask(req.params.taskId, title);
    return sendSuccess(res, task, 'Subtarea agregada');
  },

  async toggleSubtask(req: AuthRequest, res: Response) {
    const task = await taskService.toggleSubtask(req.params.taskId, req.params.subtaskId);
    return sendSuccess(res, task);
  },

  async addComment(req: AuthRequest, res: Response) {
    const { content } = addCommentSchema.parse(req.body);
    const { commentService } = await import('../services/commentService');
    const comment = await commentService.create(req.params.taskId, req.user!.userId, content);
    return sendCreated(res, comment, 'Comentario agregado');
  },

  async getComments(req: AuthRequest, res: Response) {
    const { commentService } = await import('../services/commentService');
    const comments = await commentService.findByTask(req.params.taskId);
    return sendSuccess(res, comments);
  },
};
