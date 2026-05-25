import { QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDB } from '../config/aws';
import { projectRepository } from '../repositories/projectRepository';
import { taskRepository } from '../repositories/taskRepository';

const ALERTS_TABLE = 'taskflow-alerts';

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
    byStatus:   { status: string;   count: number }[];
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

const PRIORITY_COLORS: Record<string, string> = {
  low: '#64748B',
  medium: '#3B82F6',
  high: '#F97316',
  critical: '#EF4444',
};

const last7Days = (): string[] => {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });
};

export const metricsService = {
  async getDashboard(userId: string): Promise<DashboardMetrics> {
    const now = new Date().toISOString();
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const days = last7Days();

    // ── 1. Proyectos del usuario ───────────────────────
    const projects = await projectRepository.findByOwner(userId);
    const activeProjects = projects.filter(p => p.status === 'active');

    // ── 2. Tareas de todos los proyectos activos ───────
    const allTasksNested = await Promise.all(
      activeProjects.map(p => taskRepository.findByProject(p.projectId))
    );
    const allTasks = allTasksNested.flat();

    const completedTasks  = allTasks.filter(t => !!t.completedAt);
    const openTasks       = allTasks.filter(t => !t.completedAt);
    const overdueTasks    = openTasks.filter(t => t.dueDate && t.dueDate < now);
    const completedWeek   = completedTasks.filter(t => t.completedAt! >= weekAgo);
    const completionRate  = allTasks.length > 0
      ? Math.round((completedTasks.length / allTasks.length) * 100)
      : 0;

    // ── 3. Por prioridad ───────────────────────────────
    const priorityCounts = ['low', 'medium', 'high', 'critical'].map(priority => ({
      priority: priority.charAt(0).toUpperCase() + priority.slice(1),
      count: allTasks.filter(t => t.priority === priority).length,
      color: PRIORITY_COLORS[priority],
    }));

    // ── 4. Por estado (columna) ────────────────────────
    const statusMap = new Map<string, number>();
    allTasks.forEach(t => {
      const key = t.status || t.columnId || 'Sin estado';
      statusMap.set(key, (statusMap.get(key) ?? 0) + 1);
    });
    const byStatus = Array.from(statusMap.entries()).map(([status, count]) => ({ status, count }));

    // ── 5. Velocidad últimos 7 días ────────────────────
    const velocity = days.map(date => ({
      date: date.slice(5), // MM-DD
      completadas: completedTasks.filter(t => t.completedAt?.startsWith(date)).length,
      creadas:     allTasks.filter(t => t.createdAt.startsWith(date)).length,
    }));

    // ── 6. Alertas activas ─────────────────────────────
    let alerts: DashboardMetrics['alerts'] = [];
    try {
      const alertResult = await dynamoDB.send(new ScanCommand({
        TableName: ALERTS_TABLE,
        FilterExpression: 'resolved = :false',
        ExpressionAttributeValues: { ':false': false },
        Limit: 20,
      }));
      alerts = (alertResult.Items ?? []).map(a => ({
        alertId:   a.alertId,
        projectId: a.projectId,
        type:      a.type,
        severity:  a.severity,
        message:   a.message,
        createdAt: a.createdAt,
      }));
    } catch {
      // tabla puede no existir en dev local
    }

    // ── 7. Progreso por proyecto ───────────────────────
    const projectProgress = activeProjects.map((project, i) => {
      const tasks = allTasksNested[i];
      const total     = tasks.length;
      const completed = tasks.filter(t => !!t.completedAt).length;
      const overdue   = tasks.filter(t => !t.completedAt && t.dueDate && t.dueDate < now).length;
      return {
        projectId:  project.projectId,
        name:       project.name,
        total,
        completed,
        overdue,
        percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
      };
    });

    return {
      projects: {
        total:    projects.length,
        active:   activeProjects.length,
        archived: projects.filter(p => p.status === 'archived').length,
      },
      tasks: {
        total:             allTasks.length,
        completed:         completedTasks.length,
        overdue:           overdueTasks.length,
        completedThisWeek: completedWeek.length,
        completionRate,
        byPriority: priorityCounts,
        byStatus,
      },
      velocity,
      alerts,
      projectProgress,
    };
  },

  async getProjectMetrics(projectId: string) {
    const now = new Date().toISOString();
    const tasks = await taskRepository.findByProject(projectId);
    const open      = tasks.filter(t => !t.completedAt);
    const completed = tasks.filter(t => !!t.completedAt);
    const overdue   = open.filter(t => t.dueDate && t.dueDate < now);

    return {
      total:          tasks.length,
      open:           open.length,
      completed:      completed.length,
      overdue:        overdue.length,
      completionRate: tasks.length > 0 ? Math.round((completed.length / tasks.length) * 100) : 0,
      byPriority: ['low', 'medium', 'high', 'critical'].map(p => ({
        priority: p,
        count: tasks.filter(t => t.priority === p).length,
      })),
    };
  },
};
