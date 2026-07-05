import { cn } from '@/lib/cn';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('rounded-lg bg-bg-elevated animate-pulse', className)}
    />
  );
}
