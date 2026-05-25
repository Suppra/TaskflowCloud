import { api } from './api';
import type { Board } from '@/types';

export const boardService = {
  listByProject: (projectId: string) =>
    api.get<{ success: boolean; data: Board[] }>(`/projects/${projectId}/boards`).then(r => r.data.data!),

  getById: (projectId: string, boardId: string) =>
    api.get<{ success: boolean; data: Board }>(`/projects/${projectId}/boards/${boardId}`).then(r => r.data.data!),

  create: (projectId: string, data: { name: string }) =>
    api.post<{ success: boolean; data: Board }>(`/projects/${projectId}/boards`, data).then(r => r.data.data!),

  delete: (projectId: string, boardId: string) =>
    api.delete(`/projects/${projectId}/boards/${boardId}`),

  addColumn: (projectId: string, boardId: string, data: { name: string; color?: string }) =>
    api.post<{ success: boolean; data: Board }>(`/projects/${projectId}/boards/${boardId}/columns`, data).then(r => r.data.data!),

  updateColumn: (projectId: string, boardId: string, columnId: string, data: { name?: string; color?: string }) =>
    api.patch<{ success: boolean; data: Board }>(`/projects/${projectId}/boards/${boardId}/columns/${columnId}`, data).then(r => r.data.data!),

  deleteColumn: (projectId: string, boardId: string, columnId: string) =>
    api.delete<{ success: boolean; data: Board }>(`/projects/${projectId}/boards/${boardId}/columns/${columnId}`).then(r => r.data.data!),
};
