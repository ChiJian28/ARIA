'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';

interface MiniTerminalProps {
  lines: string[];
  className?: string;
  charDelayMs?: number;
}

export function MiniTerminal({ lines, className, charDelayMs = 12 }: MiniTerminalProps) {
  const fullText = lines.join('\n');
  const [revealed, setRevealed] = useState('');
  const indexRef = useRef(0);
  const targetRef = useRef('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const clearTimer = () => {
      if (timerRef.current != null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    clearTimer();

    if (!fullText) {
      indexRef.current = 0;
      targetRef.current = '';
      setRevealed('');
      return clearTimer;
    }

    const prevTarget = targetRef.current;

    if (!prevTarget || !fullText.startsWith(prevTarget)) {
      indexRef.current = 0;
      targetRef.current = fullText;
      setRevealed('');
    } else if (fullText.length > prevTarget.length) {
      targetRef.current = fullText;
    } else if (indexRef.current >= fullText.length) {
      return clearTimer;
    }

    const tick = () => {
      const target = targetRef.current;
      if (indexRef.current >= target.length) return;

      indexRef.current += 1;
      setRevealed(target.slice(0, indexRef.current));

      if (indexRef.current < target.length) {
        timerRef.current = setTimeout(tick, charDelayMs);
      }
    };

    tick();

    return clearTimer;
  }, [fullText, charDelayMs]);

  return (
    <div
      className={cn(
        'rounded-md bg-black/40 border border-violet-500/15 px-2 py-1.5 font-mono text-[10px] leading-relaxed text-amber-400 overflow-y-auto overflow-x-hidden',
        !className?.includes('min-h') && 'min-h-[3.25rem]',
        className,
      )}
    >
      {revealed ? (
        <pre className="whitespace-pre-wrap break-words m-0">
          {revealed}
          <span className="inline-block w-1.5 h-3 ml-0.5 bg-teal-400/80 animate-pulse align-middle" />
        </pre>
      ) : (
        <span className="text-text-muted">awaiting agent stream…</span>
      )}
    </div>
  );
}
