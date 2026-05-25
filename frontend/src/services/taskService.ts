import { api } from './api';
import type { Task, Comment } from '@/types';

export const taskService = {
  listByBoard: (projectId: string, boardId: string) =>
    api.get<{ success: boolean; data: Task[] }>(`/projects/${projectId}/boards/${boardId}/tasks`).then(r => r.data.data!),

  getById: (projectId: string, boardId: string, taskId: string) =>
    api.get<{ success: boolean; data: Task }>(`/projects/${projectId}/boards/${boardId}/tasks/${taskId}`).then(r => r.data.data!),

  create: (projectId: string, boardId: string, data: Partial<Task>) =>
    api.post<{ success: boolean; data: Task }>(`/projects/${projectId}/boards/${boardId}/tasks`, data).then(r => r.data.data!),

  update: (projectId: string, boardId: string, taskId: string, data: Partial<Task>) =>
    api.patch<{ success: boolean; data: Task }>(`/projects/${projectId}/boards/${boardId}/tasks/${taskId}`, data).then(r => r.data.data!),

  delete: (projectId: string, boardId: string, taskId: string) =>
    api.delete(`/projects/${projectId}/boards/${boardId}/tasks/${taskId}`),

  addSubtask: (projectId: string, boardId: string, taskId: string, title: string) =>
    api.post<{ success: boolean; data: Task }>(`/projects/${projectId}/boards/${boardId}/tasks/${taskId}/subtasks`, { title }).then(r => r.data.data!),

  toggleSubtask: (projectId: string, boardId: string, taskId: string, subtaskId: string) =>
    api.patch<{ success: boolean; data: Task }>(`/projects/${projectId}/boards/${boardId}/tasks/${taskId}/subtasks/${subtaskId}/toggle`).then(r => r.data.data!),

  getComments: (projectId: string, boardId: string, taskId: string) =>
    api.get<{ success: boolean; data: Comment[] }>(`/projects/${projectId}/boards/${boardId}/tasks/${taskId}/comments`).then(r => r.data.data!),

  addComment: (projectId: string, boardId: string, taskId: string, content: string) =>
    api.post<{ success: boolean; data: Comment }>(`/projects/${projectId}/boards/${boardId}/tasks/${taskId}/comments`, { content }).then(r => r.data.data!),

  getPresignedUrl: (projectId: string, boardId: string, taskId: string, filename: string, mimeType: string) =>
    api.post<{ success: boolean; data: { url: string; key: string; filename: string } }>(
      `/projects/${projectId}/boards/${boardId}/tasks/${taskId}/attachments/presign`,
      { filename, mimeType }
    ).then(r => r.data.data!),
};
