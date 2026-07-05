'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchVaultStats, fetchVaultPosition, fetchVaultInstruments, fetchVaultRiskDistribution } from '@/lib/api';

export function useVaultStats() {
  return useQuery({
    queryKey: ['vault-stats'],
    queryFn: fetchVaultStats,
    refetchInterval: 30000,
  });
}

export function useVaultInstruments() {
  return useQuery({
    queryKey: ['vault-instruments'],
    queryFn: fetchVaultInstruments,
    refetchInterval: 30000,
  });
}

export function useVaultRiskDistribution() {
  return useQuery({
    queryKey: ['vault-risk-distribution'],
    queryFn: fetchVaultRiskDistribution,
    refetchInterval: 30000,
  });
}

export function useVaultPosition(address: string | null) {
  return useQuery({
    queryKey: ['vault-position', address],
    queryFn: () => fetchVaultPosition(address!),
    enabled: !!address,
    refetchInterval: 30000,
  });
}
