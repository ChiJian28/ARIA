'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchRwa, fetchRwas, fetchRwaVotes } from '@/lib/api';

export function useRwa(id: string) {
  return useQuery({ queryKey: ['rwa', id], queryFn: () => fetchRwa(id), enabled: !!id });
}

export function useRwaVotes(id: string) {
  return useQuery({
    queryKey: ['rwa-votes', id],
    queryFn: () => fetchRwaVotes(id),
    enabled: !!id,
    refetchInterval: 5000,
  });
}

export function useRwas(params?: { owner?: string; limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ['rwas', params],
    queryFn: () => fetchRwas(params),
    refetchInterval: 15000,
  });
}
