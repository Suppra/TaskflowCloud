import { useMutation, useQueryClient } from '@tanstack/react-query';
import { reportService } from '@/services/reportService';

export const useDeleteReport = (projectId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reportId: string) => reportService.deleteReport(reportId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reports', projectId] }),
  });
};
