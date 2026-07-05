import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

interface StepperProps {
  steps: string[];
  current: number;
}

export function Stepper({ steps, current }: StepperProps) {
  return (
    <div className="flex w-full justify-center">
      <div className="flex items-start">
        {steps.map((step, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <div key={step} className="flex items-start">
              <div className="flex flex-col items-center gap-1.5 min-w-[5.5rem] sm:min-w-[6.5rem]">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all shrink-0',
                    done && 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-400',
                    active && 'bg-violet-500/20 border border-violet-500/60 text-violet-400',
                    !done && !active && 'bg-bg-elevated border border-violet-500/20 text-text-muted',
                  )}
                >
                  {done ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                <span
                  className={cn(
                    'text-xs text-center leading-tight',
                    active ? 'text-violet-400' : done ? 'text-emerald-400' : 'text-text-muted',
                  )}
                >
                  {step}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className="flex items-center h-8 px-2 sm:px-3">
                  <div
                    className={cn(
                      'h-px w-10 sm:w-16 transition-colors',
                      done ? 'bg-emerald-500/40' : 'bg-violet-500/20',
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
