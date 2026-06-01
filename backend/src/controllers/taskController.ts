import { Response } from 'express';
import { taskService } from '../services/taskService';
import { commentService } from '../services/commentService';
import { projectService } from '../services/projectService';
import { AuthRequest } from '../middleware/auth';
import { createTaskSchema, updateTaskSchema, addCommentSchema, addSubtaskSchema } from '../validators/task';
import { sendSuccess, sendCreated } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { z } from 'zod';
import { uploadService } from '../services/uploadService';

// Tipos MIME permitidos para adjuntos (allowlist estricta)
const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', 'text/csv',
];

export const taskController = {
  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    await projectService.assertMember(req.params.projectId, req.user!.userId);
    const input = createTaskSchema.parse(req.body);
    const task = await taskService.create(
      req.params.boardId,
      req.params.projectId,
      input,
      req.user!.userId
    );
    return sendCreated(res, task, 'Tarea creada');
  }),

  listByBoard: asyncHandler(async (req: AuthRequest, res: Response) => {
    await projectService.assertMember(req.params.projectId, req.user!.userId);
    const filters = {
      priority:   req.query.priority   as string | undefined,
      assigneeId: req.query.assigneeId as string | undefined,
      label:      req.query.label      as string | undefined,
    };
    // Eliminar claves undefined para no pasar filtros vacíos
    const cleanFilters = Object.fromEntries(
      Object.entries(filters).filter(([, v]) => v !== undefined)
    ) as { priority?: string; assigneeId?: string; label?: string };

    const tasks = await taskService.findByBoard(req.params.boardId, cleanFilters);
    return sendSuccess(res, tasks);
  }),

  getById: asyncHandler(async (req: AuthRequest, res: Response) => {
    await projectService.assertMember(req.params.projectId, req.user!.userId);
    const task = await taskService.findById(req.params.taskId);
    return sendSuccess(res, task);
  }),

  update: asyncHandler(async (req: AuthRequest, res: Response) => {
    await projectService.assertMember(req.params.projectId, req.user!.userId);
    const input = updateTaskSchema.parse(req.body);
    const task = await taskService.update(req.params.taskId, input, req.user!.userId);
    return sendSuccess(res, task, 'Tarea actualizada');
  }),

  delete: asyncHandler(async (req: AuthRequest, res: Response) => {
    await projectService.assertMember(req.params.projectId, req.user!.userId);
    await taskService.delete(req.params.taskId);
    return sendSuccess(res, null, 'Tarea eliminada');
  }),

  addSubtask: asyncHandler(async (req: AuthRequest, res: Response) => {
    await projectService.assertMember(req.params.projectId, req.user!.userId);
    const { title } = addSubtaskSchema.parse(req.body);
    const task = await taskService.addSubtask(req.params.taskId, title);
    return sendSuccess(res, task, 'Subtarea agregada');
  }),

  toggleSubtask: asyncHandler(async (req: AuthRequest, res: Response) => {
    await projectService.assertMember(req.params.projectId, req.user!.userId);
    const task = await taskService.toggleSubtask(req.params.taskId, req.params.subtaskId);
    return sendSuccess(res, task);
  }),

  addComment: asyncHandler(async (req: AuthRequest, res: Response) => {
    await projectService.assertMember(req.params.projectId, req.user!.userId);
    const { content } = addCommentSchema.parse(req.body);
    const comment = await commentService.create(req.params.taskId, req.user!.userId, content);
    return sendCreated(res, comment, 'Comentario agregado');
  }),

  getComments: asyncHandler(async (req: AuthRequest, res: Response) => {
    await projectService.assertMember(req.params.projectId, req.user!.userId);
    const comments = await commentService.findByTask(req.params.taskId);
    return sendSuccess(res, comments);
  }),

  getPresignedUrl: asyncHandler(async (req: AuthRequest, res: Response) => {
    await projectService.assertMember(req.params.projectId, req.user!.userId);

    const { filename, mimeType } = z.object({
      filename: z.string().min(1).max(255),
      mimeType: z.string().refine(
        v => ALLOWED_MIME_TYPES.includes(v),
        { message: `Tipo de archivo no permitido. Permitidos: ${ALLOWED_MIME_TYPES.join(', ')}` }
      ),
    }).parse(req.body);

    const result = await uploadService.getPresignedUploadUrl(filename, mimeType, req.params.taskId);
    return sendSuccess(res, result);
  }),

  // Registra los metadatos del adjunto tras el upload directo a S3
  addAttachment: asyncHandler(async (req: AuthRequest, res: Response) => {
    await projectService.assertMember(req.params.projectId, req.user!.userId);

    const data = z.object({
      filename: z.string().min(1).max(255),
      s3Key: z.string().min(1),
      fileSize: z.number().int().nonnegative().max(50 * 1024 * 1024), // máx 50 MB
      mimeType: z.string().refine(
        v => ALLOWED_MIME_TYPES.includes(v),
        { message: 'Tipo de archivo no permitido' }
      ),
    }).parse(req.body);

    const task = await taskService.addAttachment(req.params.taskId, data, req.user!.userId);
    return sendCreated(res, task, 'Adjunto agregado');
  }),

  getAttachmentDownloadUrl: asyncHandler(async (req: AuthRequest, res: Response) => {
    await projectService.assertMember(req.params.projectId, req.user!.userId);
    const result = await taskService.getAttachmentDownloadUrl(req.params.taskId, req.params.attachmentId);
    return sendSuccess(res, result);
  }),

  removeAttachment: asyncHandler(async (req: AuthRequest, res: Response) => {
    await projectService.assertMember(req.params.projectId, req.user!.userId);
    const task = await taskService.removeAttachment(req.params.taskId, req.params.attachmentId);
    return sendSuccess(res, task, 'Adjunto eliminado');
  }),
};
