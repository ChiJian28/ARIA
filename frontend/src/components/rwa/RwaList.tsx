'use client';

import { RwaStatusCard } from './RwaStatusCard';
import { Skeleton } from '@/components/ui/skeleton';
import type { RwaSummary } from '@/types/api.types';

interface RwaListProps {
  rwas: RwaSummary[];
  isLoading?: boolean;
}

export function RwaList({ rwas, isLoading }: RwaListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
    );
  }

  if (rwas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-text-muted">
        <p className="text-lg mb-1">No submissions yet</p>
        <p className="text-sm">Submit your first RWA to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rwas.map((rwa) => (
        <RwaStatusCard key={rwa.id} rwa={rwa} />
      ))}
    </div>
  );
}
