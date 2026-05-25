import { api } from './api';
import type { Project } from '@/types';

export const projectService = {
  list: () =>
    api.get<{ success: boolean; data: Project[] }>('/projects').then(r => r.data.data!),

  getById: (id: string) =>
    api.get<{ success: boolean; data: Project }>(`/projects/${id}`).then(r => r.data.data!),

  create: (data: { name: string; description?: string }) =>
    api.post<{ success: boolean; data: Project }>('/projects', data).then(r => r.data.data!),

  update: (id: string, data: Partial<{ name: string; description: string; status: string }>) =>
    api.patch<{ success: boolean; data: Project }>(`/projects/${id}`, data).then(r => r.data.data!),

  archive: (id: string) =>
    api.patch<{ success: boolean; data: Project }>(`/projects/${id}/archive`).then(r => r.data.data!),

  delete: (id: string) => api.delete(`/projects/${id}`),

  inviteMember: (projectId: string, data: { email: string; role: string }) =>
    api.post<{ success: boolean; data: Project }>(`/projects/${projectId}/members`, data).then(r => r.data.data!),
};
