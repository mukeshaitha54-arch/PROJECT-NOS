import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import { Alert, PaginatedResponse } from '../types/api';
import { useGlobalStore } from '../store/global-store';

interface UseAlertsOptions {
  status?: string;
  severity?: string;
  page?: number;
  limit?: number;
}

export const useAlerts = ({ status, severity, page = 1, limit = 20 }: UseAlertsOptions = {}) => {
  const queryClient = useQueryClient();
  const { updateAlertStatus } = useGlobalStore.getState();

  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  
  if (status) queryParams.append('status', status);
  if (severity) queryParams.append('severity', severity);

  const { data, isLoading, isError, error, refetch } = useQuery<PaginatedResponse<Alert>, Error>({
    queryKey: ['alerts', page, limit, status, severity],
    queryFn: () => api.get<PaginatedResponse<Alert>>(`/alerts/active?${queryParams.toString()}`),
    staleTime: 5000,
    refetchOnWindowFocus: true,
  });

  const handleOptimisticUpdate = (id: string, newStatus: Alert['status']) => {
    // Save previous state for rollback
    const previousAlerts = queryClient.getQueryData<PaginatedResponse<Alert>>(['alerts', page, limit, status, severity]);
    
    // Update React Query Cache
    if (previousAlerts) {
      queryClient.setQueryData<PaginatedResponse<Alert>>(['alerts', page, limit, status, severity], {
        ...previousAlerts,
        data: previousAlerts.data.map(alert => 
          alert.id === id ? { ...alert, status: newStatus } : alert
        ),
      });
    }

    // Update Zustand Store
    updateAlertStatus(id, newStatus);
    
    return { previousAlerts };
  };

  const handleError = (err: unknown, variables: string, context?: { previousAlerts?: PaginatedResponse<Alert> }) => {
    if (context?.previousAlerts) {
      queryClient.setQueryData(['alerts', page, limit, status, severity], context.previousAlerts);
    }
    // Re-fetch to sync state in Zustand
    queryClient.invalidateQueries({ queryKey: ['alerts'] });
  };

  const acknowledgeMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/alerts/${id}/acknowledge`),
    onMutate: (id) => handleOptimisticUpdate(id, 'ACKNOWLEDGED'),
    onError: handleError,
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
  });

  const resolveMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/alerts/${id}/resolve`),
    onMutate: (id) => handleOptimisticUpdate(id, 'RESOLVED'),
    onError: handleError,
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
  });

  const closeMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/alerts/${id}/close`),
    onMutate: (id) => handleOptimisticUpdate(id, 'CLOSED'),
    onError: handleError,
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
  });

  return {
    data,
    isLoading,
    isError,
    error,
    refetch,
    acknowledgeAlert: acknowledgeMutation.mutate,
    resolveAlert: resolveMutation.mutate,
    closeAlert: closeMutation.mutate,
  };
};
