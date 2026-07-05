import * as React from 'react';
import { cn } from '@/lib/cn';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, id, children, ...props }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-xs font-medium text-text-secondary uppercase tracking-wide">
            {label}
          </label>
        )}
        <select
          id={selectId}
          className={cn(
            'h-10 w-full rounded-lg bg-bg-elevated border border-violet-500/20 px-3 text-sm text-text-primary',
            'focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/55',
            'transition-colors duration-150',
            error && 'border-red-500/50',
            className,
          )}
          ref={ref}
          {...props}
        >
          {children}
        </select>
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    );
  },
);
Select.displayName = 'Select';
