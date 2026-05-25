import { useQuery } from '@tanstack/react-query';
import { metricsService } from '@/services/metricsService';

export const useDashboardMetrics = () =>
  useQuery({
    queryKey: ['metrics', 'dashboard'],
    queryFn: () => metricsService.getDashboard(),
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

export const useProjectMetrics = (projectId: string) =>
  useQuery({
    queryKey: ['metrics', 'project', projectId],
    queryFn: () => metricsService.getProjectMetrics(projectId),
    enabled: !!projectId,
    staleTime: 60_000,
  });
