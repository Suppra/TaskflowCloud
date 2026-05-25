import { v4 as uuidv4 } from 'uuid';
import { boardRepository } from '../repositories/boardRepository';
import { Board, Column } from '../types';

const DEFAULT_COLUMNS: Omit<Column, 'columnId'>[] = [
  { name: 'Por hacer', order: 0, color: '#6B7280' },
  { name: 'En progreso', order: 1, color: '#3B82F6' },
  { name: 'En revisión', order: 2, color: '#F59E0B' },
  { name: 'Completado', order: 3, color: '#10B981' },
];

export const boardService = {
  async create(projectId: string, name: string): Promise<Board> {
    const now = new Date().toISOString();
    const board: Board = {
      boardId: uuidv4(),
      projectId,
      name,
      columns: DEFAULT_COLUMNS.map(c => ({ ...c, columnId: uuidv4() })),
      createdAt: now,
      updatedAt: now,
    };
    return boardRepository.create(board);
  },

  async findById(boardId: string): Promise<Board> {
    const board = await boardRepository.findById(boardId);
    if (!board) throw Object.assign(new Error('Tablero no encontrado'), { statusCode: 404 });
    return board;
  },

  async findByProject(projectId: string): Promise<Board[]> {
    return boardRepository.findByProject(projectId);
  },

  async addColumn(boardId: string, name: string, color?: string): Promise<Board> {
    const board = await this.findById(boardId);
    const newColumn: Column = {
      columnId: uuidv4(),
      name,
      order: board.columns.length,
      color,
    };
    const updated = await boardRepository.update(boardId, {
      columns: [...board.columns, newColumn],
      updatedAt: new Date().toISOString(),
    });
    return updated!;
  },

  async updateColumn(boardId: string, columnId: string, updates: Partial<Column>): Promise<Board> {
    const board = await this.findById(boardId);
    const columns = board.columns.map(c =>
      c.columnId === columnId ? { ...c, ...updates } : c
    );
    const updated = await boardRepository.update(boardId, { columns, updatedAt: new Date().toISOString() });
    return updated!;
  },

  async deleteColumn(boardId: string, columnId: string): Promise<Board> {
    const board = await this.findById(boardId);
    const columns = board.columns
      .filter(c => c.columnId !== columnId)
      .map((c, i) => ({ ...c, order: i }));
    const updated = await boardRepository.update(boardId, { columns, updatedAt: new Date().toISOString() });
    return updated!;
  },

  async delete(boardId: string): Promise<void> {
    await this.findById(boardId);
    await boardRepository.delete(boardId);
  },
};
