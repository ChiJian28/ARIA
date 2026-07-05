'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useVaultPosition } from '@/hooks/useVault';
import { useWallet } from '@/hooks/useWallet';
import { motesToCspr } from '@/lib/formatters';
import { useTxStore } from '@/store/tx.store';

/** Flashes green for 800ms when a value changes upward */
function AnimatedValue({ value, className }: { value: string; className?: string }) {
  const [flash, setFlash] = useState(false);
  const prev = useRef(value);

  useEffect(() => {
    if (prev.current !== value && Number(value) > Number(prev.current)) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 900);
      prev.current = value;
      return () => clearTimeout(t);
    }
    prev.current = value;
  }, [value]);

  return (
    <motion.span
      className={className}
      animate={flash ? { scale: [1, 1.06, 1], color: ['#10b981', '#10b981', 'inherit'] } : {}}
      transition={{ duration: 0.8 }}
    >
      {value}
    </motion.span>
  );
}

export function LpPositionCard() {
  const { address } = useWallet();
  const { data: position, isLoading } = useVaultPosition(address);
  // Select the raw array (stable reference) — filter outside the selector
  // to avoid returning a new array on every render (causes infinite re-render loop).
  const txs = useTxStore((s) => s.txs);
  const getPendingLpMotes = useTxStore((s) => s.getPendingLpMotes);
  const pendingTxs = txs.filter((t) => t.status === 'pending' && t.operation === 'deposit');
  const pendingLp = getPendingLpMotes();
  const hasPending = pendingLp > 0n;

  if (isLoading) return <Skeleton className="h-36" />;

  if (!position && !hasPending) {
    return (
      <Card>
        <CardContent className="p-5 text-center text-text-muted text-sm py-8">
          No vault position. Deposit CSPR to get started.
        </CardContent>
      </Card>
    );
  }

  const lpDisplay = position ? motesToCspr(position.lpTokens).toFixed(2) : '0.00';
  const csprDisplay = position ? motesToCspr(position.csprDeposited).toFixed(2) : '0.00';
  const yieldDisplay = position ? motesToCspr(position.yieldEarned).toFixed(4) : '0.0000';
  const pendingLpDisplay = motesToCspr(pendingLp.toString()).toFixed(2);

  return (
    <Card glow>
      <CardContent className="p-5 grid grid-cols-2 gap-4">
        {/* LP Tokens */}
        <div>
          <p className="text-xs text-text-muted mb-1">LP Tokens</p>
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <AnimatedValue
              value={lpDisplay}
              className="text-lg font-mono font-semibold text-text-primary"
            />
            <AnimatePresence>
              {hasPending && (
                <motion.span
                  key="pending-lp"
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -4 }}
                  className="flex items-center gap-1 text-xs font-mono text-amber-400/70"
                >
                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  +{pendingLpDisplay} pending
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* CSPR Value */}
        <div>
          <p className="text-xs text-text-muted mb-1">CSPR Deposited</p>
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <AnimatedValue
              value={csprDisplay}
              className="text-lg font-mono font-semibold text-text-primary"
            />
            <AnimatePresence>
              {hasPending && (
                <motion.span
                  key="pending-cspr"
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -4 }}
                  className="flex items-center gap-1 text-xs font-mono text-amber-400/70"
                >
                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  +{pendingTxs.reduce((s, t) => s + Number(t.amountMotes) / 1e9, 0).toFixed(2)} pending
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Yield */}
        <div>
          <p className="text-xs text-text-muted mb-1">Yield Earned</p>
          <p className="text-lg font-mono font-semibold text-emerald-400">{yieldDisplay}</p>
        </div>

        {/* Last updated */}
        <div>
          <p className="text-xs text-text-muted mb-1">Last Updated</p>
          <p className="text-sm text-text-secondary">
            {position ? new Date(position.lastUpdated).toLocaleString() : '—'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
