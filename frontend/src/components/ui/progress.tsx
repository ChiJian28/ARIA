import * as React from 'react';
import { cn } from '@/lib/cn';

interface ProgressProps {
  value: number;
  max?: number;
  className?: string;
  barClassName?: string;
}

export function Progress({ value, max = 100, className, barClassName }: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={cn('h-1.5 w-full rounded-full bg-bg-elevated overflow-hidden', className)}>
      <div
        className={cn(
          'h-full rounded-full bg-gradient-to-r from-violet-500 to-teal-500 transition-all duration-500',
          barClassName,
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
