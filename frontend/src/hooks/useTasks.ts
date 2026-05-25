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
