import { cn } from '@/lib/cn';
import { Card, CardContent } from './card';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  delta?: string;
  deltaPositive?: boolean;
  icon?: LucideIcon;
  className?: string;
  mono?: boolean;
}

export function StatCard({ label, value, delta, deltaPositive, icon: Icon, className, mono }: StatCardProps) {
  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">{label}</p>
            <p className={cn('text-2xl font-semibold text-text-primary', mono && 'font-mono')}>{value}</p>
            {delta && (
              <p className={cn('text-xs mt-1', deltaPositive ? 'text-emerald-400' : 'text-red-400')}>
                {deltaPositive ? '↑' : '↓'} {delta}
              </p>
            )}
          </div>
          {Icon && (
            <div className="rounded-lg bg-violet-500/10 p-2.5 shrink-0">
              <Icon className="w-5 h-5 text-violet-400" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
