'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchAgents, fetchLeaderboard, fetchAgentReputation, fetchAgentHistory } from '@/lib/api';

export function useAgents() {
  return useQuery({ queryKey: ['agents'], queryFn: fetchAgents, refetchInterval: 10000 });
}

export function useLeaderboard() {
  return useQuery({ queryKey: ['leaderboard'], queryFn: fetchLeaderboard, refetchInterval: 30000 });
}

export function useAgentReputation(id: string) {
  return useQuery({ queryKey: ['agent-rep', id], queryFn: () => fetchAgentReputation(id), enabled: !!id });
}

export function useAgentHistory(id: string) {
  return useQuery({ queryKey: ['agent-history', id], queryFn: () => fetchAgentHistory(id), enabled: !!id });
}
