import { api } from './api';

export interface DashboardMetrics {
  projects: {
    total: number;
    active: number;
    archived: number;
  };
  tasks: {
    total: number;
    completed: number;
    overdue: number;
    completedThisWeek: number;
    completionRate: number;
    byPriority: { priority: string; count: number; color: string }[];
    byStatus: { status: string; count: number }[];
  };
  velocity: { date: string; completadas: number; creadas: number }[];
  alerts: {
    alertId: string;
    projectId: string;
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    createdAt: string;
  }[];
  projectProgress: {
    projectId: string;
    name: string;
    total: number;
    completed: number;
    overdue: number;
    percentage: number;
  }[];
}

export interface ProjectMetrics {
  total: number;
  open: number;
  completed: number;
  overdue: number;
  completionRate: number;
  byPriority: { priority: string; count: number }[];
}

export const metricsService = {
  getDashboard: (): Promise<DashboardMetrics> =>
    api
      .get<{ success: boolean; data: DashboardMetrics }>('/metrics/dashboard')
      .then(r => r.data.data!),

  getProjectMetrics: (projectId: string): Promise<ProjectMetrics> =>
    api
      .get<{ success: boolean; data: ProjectMetrics }>(`/metrics/projects/${projectId}`)
      .then(r => r.data.data!),
};
