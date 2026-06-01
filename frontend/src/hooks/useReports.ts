import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportService } from '@/services/reportService';

export const useReports = (projectId: string) =>
  useQuery({
    queryKey: ['reports', projectId],
    queryFn: () => reportService.listByProject(projectId),
    enabled: !!projectId,
  });

export const useGenerateReport = (projectId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (type: 'pdf' | 'csv') => reportService.generate(projectId, type),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reports', projectId] }),
  });
};

export const useDownloadReport = () =>
  useMutation({
    mutationFn: async (reportId: string) => {
      const { url } = await reportService.getDownloadUrl(reportId);
      // Abrir en nueva pestaña para iniciar descarga
      window.open(url, '_blank');
    },
  });
