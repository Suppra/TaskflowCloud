/**
 * socketEmitter — emite eventos de tareas a todos los clientes
 * conectados a la room del proyecto.
 *
 * Todos los métodos son silenciosos si Socket.io no está inicializado
 * (modo test, dev sin ws, etc.) para no romper el flujo HTTP normal.
 */

import { getIO } from '../config/socket';
import type { Task, Comment } from '../types';

function safeEmit(room: string, event: string, data: unknown): void {
  try {
    getIO().to(room).emit(event, data);
  } catch {
    // Socket.io no disponible — flujo HTTP sigue funcionando igual
  }
}

export const socketEmitter = {
  /** Una tarea fue creada en el proyecto */
  taskCreated(projectId: string, task: Task): void {
    safeEmit(`project:${projectId}`, 'task:created', task);
  },

  /** Una tarea fue actualizada (columna, título, prioridad, asignado, etc.) */
  taskUpdated(projectId: string, task: Task): void {
    safeEmit(`project:${projectId}`, 'task:updated', task);
  },

  /** Una tarea fue eliminada */
  taskDeleted(projectId: string, taskId: string): void {
    safeEmit(`project:${projectId}`, 'task:deleted', { taskId, projectId });
  },

  /** Un comentario fue añadido a una tarea */
  commentCreated(projectId: string, taskId: string, comment: Comment): void {
    safeEmit(`project:${projectId}`, 'comment:created', { taskId, comment });
  },
};
