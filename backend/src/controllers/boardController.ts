import { z } from 'zod';
import { Response } from 'express';
import { boardService } from '../services/boardService';
import { AuthRequest } from '../middleware/auth';
import { sendSuccess, sendCreated } from '../utils/response';

const createBoardSchema = z.object({ name: z.string().min(1).max(150) });
const columnSchema = z.object({ name: z.string().min(1).max(100), color: z.string().optional() });

export const boardController = {
  async create(req: AuthRequest, res: Response) {
    const { name } = createBoardSchema.parse(req.body);
    const board = await boardService.create(req.params.projectId, name);
    return sendCreated(res, board, 'Tablero creado');
  },

  async listByProject(req: AuthRequest, res: Response) {
    const boards = await boardService.findByProject(req.params.projectId);
    return sendSuccess(res, boards);
  },

  async getById(req: AuthRequest, res: Response) {
    const board = await boardService.findById(req.params.boardId);
    return sendSuccess(res, board);
  },

  async delete(req: AuthRequest, res: Response) {
    await boardService.delete(req.params.boardId);
    return sendSuccess(res, null, 'Tablero eliminado');
  },

  async addColumn(req: AuthRequest, res: Response) {
    const { name, color } = columnSchema.parse(req.body);
    const board = await boardService.addColumn(req.params.boardId, name, color);
    return sendSuccess(res, board, 'Columna agregada');
  },

  async updateColumn(req: AuthRequest, res: Response) {
    const { name, color } = columnSchema.partial().parse(req.body);
    const board = await boardService.updateColumn(req.params.boardId, req.params.columnId, { name, color });
    return sendSuccess(res, board, 'Columna actualizada');
  },

  async deleteColumn(req: AuthRequest, res: Response) {
    const board = await boardService.deleteColumn(req.params.boardId, req.params.columnId);
    return sendSuccess(res, board, 'Columna eliminada');
  },
};
