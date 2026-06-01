import { projectRepository } from '../repositories/projectRepository';
import { taskRepository } from '../repositories/taskRepository';
import { eventPublisher } from '../events/eventPublisher';
import { env } from '../config/env';
import { Task } from '../types';

/** Peso de carga por prioridad: una tarea crítica "pesa" más que una baja. */
const PRIORITY_WEIGHT: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 5,
};

interface PickOptions {
  /** userId a excluir como candidato (p.ej. el miembro que se está eliminando). */
  excludeUserId?: string;
  /** Tareas ya cargadas, para evitar releer DynamoDB en bucles de reasignación. */
  tasks?: Task[];
}

export const assignmentService = {
  /**
   * Selecciona automáticamente al colaborador más adecuado para una tarea
   * mediante balanceo de carga ponderado por prioridad.
   *
   * Criterios (en orden):
   *  1. Solo miembros con rol 'admin' o 'member' (los 'viewer' son solo lectura).
   *  2. Se prioriza a quienes están por DEBAJO del tope de capacidad
   *     (MAX_TASKS_PER_MEMBER). Si todos están en el tope, se asigna igual.
   *  3. Gana quien tiene MENOR carga = suma de pesos de sus tareas abiertas.
   *  4. Desempate: menos tareas abiertas → luego el que se unió antes.
   *
   * @returns userId del colaborador elegido, o undefined si no hay candidatos.
   */
  async pickAssignee(projectId: string, options: PickOptions = {}): Promise<string | undefined> {
    const project = await projectRepository.findById(projectId);
    if (!project) return undefined;

    const candidates = project.members.filter(
      m => m.role !== 'viewer' && m.userId !== options.excludeUserId
    );
    if (candidates.length === 0) return undefined;
    if (candidates.length === 1) return candidates[0].userId;

    const tasks = options.tasks ?? (await taskRepository.findByProject(projectId));
    const openTasks = tasks.filter(t => !t.completedAt);

    const load = new Map<string, { score: number; count: number }>();
    for (const m of candidates) load.set(m.userId, { score: 0, count: 0 });

    for (const t of openTasks) {
      if (!t.assigneeId) continue;
      const entry = load.get(t.assigneeId);
      if (!entry) continue;
      entry.score += PRIORITY_WEIGHT[t.priority] ?? 2;
      entry.count += 1;
    }

    const joinedAtById = new Map(candidates.map(m => [m.userId, m.joinedAt]));
    const cap = env.MAX_TASKS_PER_MEMBER;

    // Preferir candidatos por debajo del tope; si ninguno, considerar a todos.
    const underCap = candidates.filter(m => (load.get(m.userId)!.count) < cap);
    const pool = underCap.length > 0 ? underCap : candidates;

    let best: string | undefined;
    let bestScore = Infinity;
    let bestCount = Infinity;
    let bestJoined = '';

    for (const m of pool) {
      const { score, count } = load.get(m.userId)!;
      const joined = joinedAtById.get(m.userId) ?? '';
      const better =
        score < bestScore ||
        (score === bestScore && count < bestCount) ||
        (score === bestScore && count === bestCount && joined < bestJoined);

      if (best === undefined || better) {
        best = m.userId;
        bestScore = score;
        bestCount = count;
        bestJoined = joined;
      }
    }

    return best;
  },

  /**
   * Reasigna automáticamente las tareas abiertas que quedaron "huérfanas"
   * (asignadas a un usuario que ya no es candidato, p.ej. al ser removido del
   * proyecto). Cada tarea se reasigna al colaborador con menor carga.
   *
   * @returns número de tareas reasignadas.
   */
  async reassignOrphanTasks(projectId: string, orphanUserId: string): Promise<number> {
    const tasks = await taskRepository.findByProject(projectId);
    const orphans = tasks.filter(t => t.assigneeId === orphanUserId && !t.completedAt);
    if (orphans.length === 0) return 0;

    let reassigned = 0;
    for (const task of orphans) {
      const newAssignee = await this.pickAssignee(projectId, {
        excludeUserId: orphanUserId,
        tasks,
      });

      // Si no hay otro candidato, la tarea queda sin asignar
      const updates: Partial<Task> = {
        assigneeId: newAssignee,
        updatedAt: new Date().toISOString(),
      };
      await taskRepository.update(task.taskId, updates);

      // Reflejar el cambio en la lista local para balancear las siguientes
      task.assigneeId = newAssignee;

      if (newAssignee) {
        reassigned++;
        await eventPublisher.publish({
          type: 'TASK_UPDATED',
          payload: {
            taskId: task.taskId,
            projectId,
            assigneeId: newAssignee,
            reason: 'auto-reassign:member-removed',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }

    return reassigned;
  },
};
