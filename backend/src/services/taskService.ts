import { v4 as uuidv4 } from 'uuid';
import { taskRepository } from '../repositories/taskRepository';
import { eventPublisher } from '../events/eventPublisher';
import { Task, Subtask } from '../types';
import { CreateTaskInput, UpdateTaskInput } from '../validators/task';

export const taskService = {
  async create(
    boardId: string,
    projectId: string,
    input: CreateTaskInput,
    reporterId: string
  ): Promise<Task> {
    const now = new Date().toISOString();
    const task: Task = {
      taskId: uuidv4(),
      boardId,
      projectId,
      columnId: input.columnId,
      status: input.columnId, // status siempre sincronizado con columnId
      title: input.title,
      description: input.description,
      priority: input.priority,
      assigneeId: input.assigneeId,
      reporterId,
      dueDate: input.dueDate,
      labels: input.labels,
      subtasks: [],
      attachments: [],
      order: input.order,
      createdAt: now,
      updatedAt: now,
    };

    const created = await taskRepository.create(task);

    await eventPublisher.publish({
      type: 'TASK_CREATED',
      payload: { taskId: created.taskId, projectId, assigneeId: input.assigneeId, reporterId },
      timestamp: now,
    });

    return created;
  },

  async findById(taskId: string): Promise<Task> {
    const task = await taskRepository.findById(taskId);
    if (!task) throw Object.assign(new Error('Tarea no encontrada'), { statusCode: 404 });
    return task;
  },

  async findByBoard(boardId: string): Promise<Task[]> {
    return taskRepository.findByBoard(boardId);
  },

  async update(taskId: string, input: UpdateTaskInput, userId: string): Promise<Task> {
    await this.findById(taskId); // verifica existencia
    const now = new Date().toISOString();

    const updates: Partial<Task> = { ...input, updatedAt: now };

    // Mantener status siempre sincronizado con columnId
    if (input.columnId !== undefined) {
      updates.status = input.columnId;
    }

    const updated = await taskRepository.update(taskId, updates);
    if (!updated) throw new Error('Error al actualizar tarea');

    await eventPublisher.publish({
      type: 'TASK_UPDATED',
      payload: { taskId, updatedBy: userId, changes: input },
      timestamp: now,
    });

    return updated;
  },

  async delete(taskId: string): Promise<void> {
    await this.findById(taskId);
    await taskRepository.delete(taskId);
  },

  async addSubtask(taskId: string, title: string): Promise<Task> {
    const task = await this.findById(taskId);
    const subtask: Subtask = {
      subtaskId: uuidv4(),
      title,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    const updated = await taskRepository.update(taskId, {
      subtasks: [...task.subtasks, subtask],
      updatedAt: new Date().toISOString(),
    });
    return updated!;
  },

  async toggleSubtask(taskId: string, subtaskId: string): Promise<Task> {
    const task = await this.findById(taskId);
    const subtasks = task.subtasks.map(s =>
      s.subtaskId === subtaskId ? { ...s, completed: !s.completed } : s
    );
    const updated = await taskRepository.update(taskId, {
      subtasks,
      updatedAt: new Date().toISOString(),
    });
    return updated!;
  },
};
