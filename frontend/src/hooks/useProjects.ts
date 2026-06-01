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

export const useMembers = (projectId: string) =>
  useQuery({
    queryKey: ['projects', projectId, 'members'],
    queryFn: () => projectService.getMembers(projectId),
    enabled: !!projectId,
  });

export const useInviteMember = (projectId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string; role: string }) =>
      projectService.inviteMember(projectId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects', projectId] });
      qc.invalidateQueries({ queryKey: ['projects', projectId, 'members'] });
      qc.invalidateQueries({ queryKey: ['projects'] });
    },
  });
};

export const useUpdateMemberRole = (projectId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: string }) =>
      projectService.updateMemberRole(projectId, memberId, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects', projectId] });
      qc.invalidateQueries({ queryKey: ['projects', projectId, 'members'] });
    },
  });
};

export const useRemoveMember = (projectId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => projectService.removeMember(projectId, memberId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects', projectId] });
      qc.invalidateQueries({ queryKey: ['projects', projectId, 'members'] });
      qc.invalidateQueries({ queryKey: ['projects'] });
    },
  });
};
