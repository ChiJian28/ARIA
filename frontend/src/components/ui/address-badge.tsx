'use client';

import { Copy, Check } from 'lucide-react';
import { useClipboard } from '@/hooks/useClipboard';
import { formatAddress } from '@/lib/formatters';
import { cn } from '@/lib/cn';

interface AddressBadgeProps {
  address: string;
  chars?: number;
  className?: string;
}

export function AddressBadge({ address, chars = 6, className }: AddressBadgeProps) {
  const { copied, copy } = useClipboard();
  return (
    <button
      onClick={() => copy(address)}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md bg-bg-elevated px-2 py-1 font-mono text-xs text-text-secondary hover:text-text-primary transition-colors',
        className,
      )}
    >
      {formatAddress(address, chars)}
      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}
