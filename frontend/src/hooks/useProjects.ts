import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectService } from '@/services/projectService';

export const useProjects = () =>
  useQuery({ queryKey: ['projects'], queryFn: projectService.list });

export const useProject = (id: string) =>
  useQuery({ queryKey: ['projects', id], queryFn: () => projectService.getById(id), enabled: !!id });

export const useCreateProject = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: projectService.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
};

export const useUpdateProject = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof projectService.update>[1] }) =>
      projectService.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
};

export const useDeleteProject = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: projectService.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
};
