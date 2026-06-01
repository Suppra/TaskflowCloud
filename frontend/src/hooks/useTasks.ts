import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskService } from '@/services/taskService';
import { boardService } from '@/services/boardService';
import type { Task } from '@/types';

export const useTasks = (projectId: string, boardId: string) =>
  useQuery({
    queryKey: ['tasks', boardId],
    queryFn: () => taskService.listByBoard(projectId, boardId),
    enabled: !!projectId && !!boardId,
  });

export const useCreateTask = (projectId: string, boardId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Task>) => taskService.create(projectId, boardId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', boardId] }),
  });
};

export const useUpdateTask = (projectId: string, boardId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: Partial<Task> }) =>
      taskService.update(projectId, boardId, taskId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', boardId] }),
  });
};

export const useDeleteTask = (projectId: string, boardId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => taskService.delete(projectId, boardId, taskId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', boardId] }),
  });
};

export const useBoards = (projectId: string) =>
  useQuery({
    queryKey: ['boards', projectId],
    queryFn: () => boardService.listByProject(projectId),
    enabled: !!projectId,
  });

// ── Comentarios y subtareas (para el modal de detalle de tarea) ────────────
export const useComments = (projectId: string, boardId: string, taskId: string | null) =>
  useQuery({
    queryKey: ['comments', taskId],
    queryFn: () => taskService.getComments(projectId, boardId, taskId!),
    enabled: !!projectId && !!boardId && !!taskId,
  });

export const useAddComment = (projectId: string, boardId: string, taskId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => taskService.addComment(projectId, boardId, taskId, content),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comments', taskId] }),
  });
};

export const useAddSubtask = (projectId: string, boardId: string, taskId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (title: string) => taskService.addSubtask(projectId, boardId, taskId, title),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', boardId] }),
  });
};

export const useToggleSubtask = (projectId: string, boardId: string, taskId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (subtaskId: string) => taskService.toggleSubtask(projectId, boardId, taskId, subtaskId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', boardId] }),
  });
};

// ── Adjuntos ───────────────────────────────────────────────────────────────
/**
 * Sube un archivo: 1) pide presigned URL → 2) PUT directo a S3 →
 * 3) registra los metadatos en la tarea. Invalida la lista al terminar.
 */
export const useUploadAttachment = (projectId: string, boardId: string, taskId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const { url, key } = await taskService.getPresignedUrl(projectId, boardId, taskId, file.name, file.type);
      await taskService.uploadToS3(url, file);
      return taskService.addAttachment(projectId, boardId, taskId, {
        filename: file.name,
        s3Key: key,
        fileSize: file.size,
        mimeType: file.type,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', boardId] }),
  });
};

export const useDeleteAttachment = (projectId: string, boardId: string, taskId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: string) => taskService.deleteAttachment(projectId, boardId, taskId, attachmentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', boardId] }),
  });
};

/** Abre la URL de descarga pre-firmada del adjunto en una pestaña nueva. */
export const useDownloadAttachment = (projectId: string, boardId: string, taskId: string) =>
  useMutation({
    mutationFn: (attachmentId: string) =>
      taskService.getAttachmentDownloadUrl(projectId, boardId, taskId, attachmentId),
    onSuccess: ({ url }) => window.open(url, '_blank', 'noopener'),
  });
