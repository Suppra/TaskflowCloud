import { z } from 'zod';
import { Response } from 'express';
import { boardService } from '../services/boardService';
import { projectService } from '../services/projectService';
import { AuthRequest } from '../middleware/auth';
import { sendSuccess, sendCreated } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';

const createBoardSchema = z.object({ name: z.string().min(1).max(150) });
const columnSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().optional(),
});

export const boardController = {
  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    // Viewers no pueden crear tableros
    await projectService.assertNotViewer(req.params.projectId, req.user!.userId);
    const { name } = createBoardSchema.parse(req.body);
    const board = await boardService.create(req.params.projectId, name);
    return sendCreated(res, board, 'Tablero creado');
  }),

  listByProject: asyncHandler(async (req: AuthRequest, res: Response) => {
    await projectService.assertMember(req.params.projectId, req.user!.userId); // lectura: viewers permitidos
    const boards = await boardService.findByProject(req.params.projectId);
    return sendSuccess(res, boards);
  }),

  getById: asyncHandler(async (req: AuthRequest, res: Response) => {
    await projectService.assertMember(req.params.projectId, req.user!.userId); // lectura: viewers permitidos
    const board = await boardService.findById(req.params.boardId);
    return sendSuccess(res, board);
  }),

  delete: asyncHandler(async (req: AuthRequest, res: Response) => {
    await projectService.assertNotViewer(req.params.projectId, req.user!.userId);
    await boardService.delete(req.params.boardId);
    return sendSuccess(res, null, 'Tablero eliminado');
  }),

  addColumn: asyncHandler(async (req: AuthRequest, res: Response) => {
    await projectService.assertNotViewer(req.params.projectId, req.user!.userId);
    const { name, color } = columnSchema.parse(req.body);
    const board = await boardService.addColumn(req.params.boardId, name, color);
    return sendSuccess(res, board, 'Columna agregada');
  }),

  updateColumn: asyncHandler(async (req: AuthRequest, res: Response) => {
    await projectService.assertNotViewer(req.params.projectId, req.user!.userId);
    const { name, color } = columnSchema.partial().parse(req.body);
    const board = await boardService.updateColumn(req.params.boardId, req.params.columnId, { name, color });
    return sendSuccess(res, board, 'Columna actualizada');
  }),

  deleteColumn: asyncHandler(async (req: AuthRequest, res: Response) => {
    await projectService.assertNotViewer(req.params.projectId, req.user!.userId);
    const board = await boardService.deleteColumn(req.params.boardId, req.params.columnId);
    return sendSuccess(res, board, 'Columna eliminada');
  }),
};
