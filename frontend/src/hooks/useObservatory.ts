import { useQuery } from '@tanstack/react-query';
import { fetchObservatoryAuditTrail } from '@/lib/api';

export function useObservatoryAuditTrail(limit = 20) {
  return useQuery({
    queryKey: ['observatory', 'audit-trail', limit],
    queryFn: () => fetchObservatoryAuditTrail({ limit }),
    staleTime: 30_000,
  });
}
