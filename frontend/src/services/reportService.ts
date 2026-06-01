import { api } from './api';
import type { Report } from '@/types';

export const reportService = {
  listByProject: (projectId: string) =>
    api.get<{ success: boolean; data: Report[] }>(`/reports/projects/${projectId}`)
      .then(r => r.data.data ?? []),

  generate: (projectId: string, type: 'pdf' | 'csv') =>
    api.post<{ success: boolean; data: Report }>(`/reports/projects/${projectId}`, { type })
      .then(r => r.data.data!),

  getDownloadUrl: (reportId: string) =>
    api.get<{ success: boolean; data: { url: string; expiresIn: number } }>(`/reports/${reportId}/download`)
      .then(r => r.data.data!),
};
