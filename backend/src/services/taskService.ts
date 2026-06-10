import { v4 as uuidv4 } from 'uuid';
import { taskRepository } from '../repositories/taskRepository';
import { assignmentService } from './assignmentService';
import { uploadService } from './uploadService';
import { eventPublisher } from '../events/eventPublisher';
import { Task, Subtask, Attachment } from '../types';
import { CreateTaskInput, UpdateTaskInput } from '../validators/task';

export const taskService = {
  async create(
    boardId: string,
    projectId: string,
    input: CreateTaskInput,
    reporterId: string
  ): Promise<Task> {
    const now = new Date().toISOString();

    // ── Auto-asignación inteligente ───────────────────────────────────────
    // Si quien crea la tarea no eligió un responsable explícito, el sistema
    // asigna automáticamente al colaborador con menor carga de trabajo
    // (balanceo ponderado por prioridad). Filosofía: el usuario hace lo básico,
    // el sistema automatiza el resto.
    const assigneeId =
      input.assigneeId ?? (await assignmentService.pickAssignee(projectId));

    const autoAssigned = !input.assigneeId && !!assigneeId;

    const task: Task = {
      taskId: uuidv4(),
      boardId,
      projectId,
      columnId: input.columnId,
      status: input.columnId, // status siempre sincronizado con columnId
      title: input.title,
      description: input.description,
      priority: input.priority,
      assigneeId,
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
      payload: { taskId: created.taskId, projectId, assigneeId, reporterId, autoAssigned },
      timestamp: now,
    });

    return created;
  },

  async findById(taskId: string): Promise<Task> {
    const task = await taskRepository.findById(taskId);
    if (!task) throw Object.assign(new Error('Tarea no encontrada'), { statusCode: 404 });
    return task;
  },

  async findByBoard(
    boardId: string,
    filters?: { priority?: string; assigneeId?: string; label?: string }
  ): Promise<Task[]> {
    return taskRepository.findByBoard(boardId, filters);
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
    await this.findById(taskId); // valida existencia (lanza 404 si no)
    const subtask: Subtask = {
      subtaskId: uuidv4(),
      title,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    // Append ATÓMICO (list_append) — evita lost-update con concurrencia.
    const updated = await taskRepository.appendToList(taskId, 'subtasks', subtask);
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

  /**
   * Registra los metadatos de un adjunto en la tarea DESPUÉS de que el cliente
   * subió el archivo a S3 con la presigned URL. El binario nunca pasa por el
   * backend (upload directo a S3); aquí solo se persiste su referencia.
   */
  async addAttachment(
    taskId: string,
    data: { filename: string; s3Key: string; fileSize: number; mimeType: string },
    uploadedBy: string
  ): Promise<Task> {
    await this.findById(taskId); // valida existencia (lanza 404 si no)
    const attachment: Attachment = {
      attachmentId: uuidv4(),
      filename: data.filename,
      s3Key: data.s3Key,
      fileSize: data.fileSize,
      mimeType: data.mimeType,
      uploadedBy,
      uploadedAt: new Date().toISOString(),
    };
    // Append ATÓMICO (list_append) — evita lost-update con concurrencia.
    const updated = await taskRepository.appendToList(taskId, 'attachments', attachment);
    return updated!;
  },

  /** Elimina un adjunto de la tarea y borra el objeto del bucket S3. */
  async removeAttachment(taskId: string, attachmentId: string): Promise<Task> {
    const task = await this.findById(taskId);
    const target = (task.attachments ?? []).find(a => a.attachmentId === attachmentId);
    if (!target) {
      throw Object.assign(new Error('Adjunto no encontrado'), { statusCode: 404 });
    }

    // Borra el objeto en S3 (no bloquea si falla en local/dev sin S3 real)
    try {
      await uploadService.deleteFile(target.s3Key);
    } catch (err) {
      console.error('[taskService] Error al borrar objeto S3:', (err as Error).message);
    }

    const updated = await taskRepository.update(taskId, {
      attachments: (task.attachments ?? []).filter(a => a.attachmentId !== attachmentId),
      updatedAt: new Date().toISOString(),
    });
    return updated!;
  },

  /** Devuelve una URL pre-firmada para descargar un adjunto concreto. */
  async getAttachmentDownloadUrl(taskId: string, attachmentId: string) {
    const task = await this.findById(taskId);
    const target = (task.attachments ?? []).find(a => a.attachmentId === attachmentId);
    if (!target) {
      throw Object.assign(new Error('Adjunto no encontrado'), { statusCode: 404 });
    }
    return uploadService.getPresignedDownloadUrl(target.s3Key, target.filename);
  },
};
