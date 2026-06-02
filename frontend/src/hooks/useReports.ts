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

      if (url.startsWith('/') || url.startsWith('http://localhost')) {
        // Dev: URL relativa al backend → fetch con auth header y crear blob
        const { api } = await import('@/services/api');
        const response = await api.get<Blob>(url, { responseType: 'blob' });
        const blobUrl = URL.createObjectURL(response.data);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = 'reporte';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
      } else {
        // Prod: S3 presigned URL → abrir directamente en nueva pestaña
        window.open(url, '_blank', 'noopener');
      }
    },
  });
