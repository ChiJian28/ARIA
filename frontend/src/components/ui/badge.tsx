import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const badgeVariants = cva('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium', {
  variants: {
    variant: {
      pending: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
      approved: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
      rejected: 'bg-red-500/15 text-red-400 border border-red-500/30',
      live: 'bg-violet-500/15 text-violet-400 border border-violet-500/30 animate-pulse',
      analyzing: 'bg-sky-500/15 text-sky-400 border border-sky-500/30',
      voting: 'bg-violet-500/15 text-violet-400 border border-violet-500/30',
      settled: 'bg-teal-500/15 text-teal-400 border border-teal-500/30',
      defaulted: 'bg-red-500/15 text-red-400 border border-red-500/30',
      default: 'bg-bg-elevated text-text-secondary border border-violet-500/20',
    },
  },
  defaultVariants: { variant: 'default' },
});

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, VariantProps<typeof badgeVariants>['variant']> = {
    PENDING: 'pending',
    ANALYZING: 'analyzing',
    VOTING: 'voting',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    SETTLED: 'settled',
    DEFAULTED: 'defaulted',
  };
  const labels: Record<string, string> = {
    PENDING: 'Pending',
    ANALYZING: 'Analyzing',
    VOTING: 'Voting',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    SETTLED: 'Settled',
    DEFAULTED: 'Defaulted',
  };
  return <Badge variant={map[status] ?? 'default'}>{labels[status] ?? status}</Badge>;
}
