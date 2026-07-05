'use client';

import { useAgentStore } from '@/store/agent.store';
import { cn } from '@/lib/cn';

export function LiveDot() {
  const connected = useAgentStore((s) => s.sseConnected);
  return (
    <div className="flex items-center gap-1.5">
      <div className="relative flex items-center justify-center w-2.5 h-2.5">
        <div className={cn(
          'w-2 h-2 rounded-full transition-colors duration-500',
          connected ? 'bg-emerald-400' : 'bg-amber-400'
        )} />
        {connected && (
          <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-50" />
        )}
        {!connected && (
          <div className="absolute inset-0 rounded-full bg-amber-400 animate-ping opacity-40" />
        )}
      </div>
      <span className="text-xs text-text-secondary hidden sm:block">
        {connected ? 'Live' : 'Connecting…'}
      </span>
    </div>
  );
}
